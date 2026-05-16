import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode, GeneratedResumeItem, GeneratedResumeDetail, CreateGeneratedResumeRequest, UpdateGeneratedResumeRequest } from "@cvbuilder/shared";

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
        resumeId: dto.resumeId,
        analysisRecordId: dto.analysisRecordId,
      },
    });

    return {
      id: record.id,
      name: record.name,
      snippet: record.content.slice(0, 120),
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

    const updated = await this.prisma.generatedResume.update({
      where: { id },
      data: { name: dto.name, content: dto.content },
    });

    return {
      id: updated.id,
      name: updated.name,
      snippet: updated.content.slice(0, 120),
      resumeId: updated.resumeId ?? undefined,
      analysisRecordId: updated.analysisRecordId ?? undefined,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
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
