import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode, GeneratedResumeItem, GeneratedResumeDetail, CreateGeneratedResumeRequest, UpdateGeneratedResumeRequest, GeneratedResumeVersionItem, GeneratedResumeVersionDetail, VersionSource } from "@cvbuilder/shared";

const VERSION_LIMIT = 20;

@Injectable()
export class GeneratedResumesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateGeneratedResumeRequest): Promise<GeneratedResumeItem> {
    const existing = await this.prisma.generatedResume.findFirst({
      where: { userId, name: dto.name },
    });
    if (existing) {
      throw new HttpException(
        { code: ErrorCode.DUPLICATE_NAME, message: `名称「${dto.name}」已存在，请更换名称` },
        409,
      );
    }

    const record = await this.prisma.generatedResume.create({
      data: {
        userId,
        name: dto.name,
        content: dto.content,
        templateId: dto.templateId ?? "modern",
        resumeId: dto.resumeId,
        analysisRecordId: dto.analysisRecordId,
      },
    });

    return {
      id: record.id,
      name: record.name,
      snippet: record.content.slice(0, 120),
      templateId: record.templateId,
      resumeId: record.resumeId ?? undefined,
      analysisRecordId: record.analysisRecordId ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async list(userId: string): Promise<GeneratedResumeItem[]> {
    const records = await this.prisma.generatedResume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return records.map((r) => ({
      id: r.id,
      name: r.name,
      snippet: r.content.slice(0, 120),
      templateId: r.templateId,
      resumeId: r.resumeId ?? undefined,
      analysisRecordId: r.analysisRecordId ?? undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async detail(id: string, userId: string): Promise<GeneratedResumeDetail> {
    const record = await this.prisma.generatedResume.findUnique({ where: { id } });
    if (!record || record.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }

    return {
      id: record.id,
      name: record.name,
      snippet: record.content.slice(0, 120),
      content: record.content,
      templateId: record.templateId,
      resumeId: record.resumeId ?? undefined,
      analysisRecordId: record.analysisRecordId ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async update(id: string, userId: string, dto: UpdateGeneratedResumeRequest): Promise<GeneratedResumeItem> {
    const record = await this.prisma.generatedResume.findUnique({ where: { id } });
    if (!record || record.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }

    if (dto.name !== record.name) {
      const duplicate = await this.prisma.generatedResume.findFirst({
        where: { userId, name: dto.name, id: { not: id } },
      });
      if (duplicate) {
        throw new HttpException(
          { code: ErrorCode.DUPLICATE_NAME, message: `名称「${dto.name}」已存在，请更换名称` },
          409,
        );
      }
    }

    const nextTemplateId = dto.templateId && dto.templateId.trim() ? dto.templateId : record.templateId;
    const hasChanges = dto.name !== record.name || dto.content !== record.content || nextTemplateId !== record.templateId;
    const updated = hasChanges
      ? await this.prisma.$transaction(async (tx) => {
        if (dto.name !== record.name || dto.content !== record.content) {
          await tx.generatedResumeVersion.create({ data: { generatedResumeId: id, name: record.name, content: record.content, source: "auto" } });
        }
        const next = await tx.generatedResume.update({ where: { id }, data: { name: dto.name, content: dto.content, templateId: nextTemplateId } });
        await this.trimVersions(tx, id);
        return next;
      })
      : record;

    return {
      id: updated.id,
      name: updated.name,
      snippet: updated.content.slice(0, 120),
      templateId: updated.templateId,
      resumeId: updated.resumeId ?? undefined,
      analysisRecordId: updated.analysisRecordId ?? undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async listVersions(id: string, userId: string): Promise<GeneratedResumeVersionItem[]> {
    await this.requireOwnedResume(id, userId);
    const versions = await this.prisma.generatedResumeVersion.findMany({ where: { generatedResumeId: id }, orderBy: { createdAt: "desc" } });
    return versions.map((version) => this.versionItem(version));
  }

  async createVersion(id: string, userId: string, label?: string): Promise<GeneratedResumeVersionItem> {
    const record = await this.requireOwnedResume(id, userId);
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.generatedResumeVersion.create({ data: { generatedResumeId: id, name: record.name, content: record.content, source: "manual", label } });
      await this.trimVersions(tx, id);
      return this.versionItem(version);
    });
  }

  async versionDetail(id: string, versionId: string, userId: string): Promise<GeneratedResumeVersionDetail> {
    await this.requireOwnedResume(id, userId);
    const version = await this.prisma.generatedResumeVersion.findFirst({ where: { id: versionId, generatedResumeId: id } });
    if (!version) throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "版本不存在" }, 404);
    return { ...this.versionItem(version), name: version.name, content: version.content };
  }

  async restoreVersion(id: string, versionId: string, userId: string): Promise<GeneratedResumeItem> {
    const record = await this.requireOwnedResume(id, userId);
    const version = await this.prisma.generatedResumeVersion.findFirst({ where: { id: versionId, generatedResumeId: id } });
    if (!version) throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "版本不存在" }, 404);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.generatedResumeVersion.create({ data: { generatedResumeId: id, name: record.name, content: record.content, source: "before_restore" } });
      const next = await tx.generatedResume.update({ where: { id }, data: { name: version.name, content: version.content } });
      await tx.generatedResumeVersion.create({ data: { generatedResumeId: id, name: version.name, content: version.content, source: "auto" } });
      await this.trimVersions(tx, id);
      return next;
    });
    return { id: updated.id, name: updated.name, snippet: updated.content.slice(0, 120), templateId: updated.templateId, resumeId: updated.resumeId ?? undefined, analysisRecordId: updated.analysisRecordId ?? undefined, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
  }

  private async requireOwnedResume(id: string, userId: string) {
    const record = await this.prisma.generatedResume.findUnique({ where: { id } });
    if (!record || record.userId !== userId) throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    return record;
  }

  private versionItem(version: { id: string; label: string | null; source: string; createdAt: Date }): GeneratedResumeVersionItem {
    return { id: version.id, label: version.label ?? undefined, source: version.source as VersionSource, createdAt: version.createdAt.toISOString() };
  }

  private async trimVersions(tx: any, generatedResumeId: string): Promise<void> {
    const excess = await tx.generatedResumeVersion.findMany({ where: { generatedResumeId }, orderBy: { createdAt: "desc" }, skip: VERSION_LIMIT, select: { id: true } });
    if (excess.length > 0) await tx.generatedResumeVersion.deleteMany({ where: { id: { in: excess.map((version: { id: string }) => version.id) } } });
  }

  async delete(id: string, userId: string): Promise<{ success: true }> {
    const record = await this.prisma.generatedResume.findUnique({ where: { id } });
    if (!record || record.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }

    await this.prisma.generatedResume.delete({ where: { id } });
    return { success: true };
  }
}
