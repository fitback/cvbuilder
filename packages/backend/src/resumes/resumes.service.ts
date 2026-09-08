import { Injectable, HttpException, Inject, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../common/cache/cache.service";
import { UploadResponse, ErrorCode, ResumeItem, ResumeDetail, ParseStatus, ParseResult, ResumeVersionItem, ResumeVersionDetail, VersionSource } from "@cvbuilder/shared";
import { v4 as uuid } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { Queue } from "bullmq";
import { PARSE_QUEUE } from "./parse-queue.provider";

const ALLOWED_TYPES: Record<string, "pdf" | "docx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const VERSION_LIMIT = 20;

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    @Inject(PARSE_QUEUE) private parseQueue: Queue,
  ) {}

  async upload(file: Express.Multer.File, userId: string): Promise<UploadResponse> {
    if (!file) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "No file provided" }, 400);

    // Empty file check
    if (!file.buffer || file.buffer.length === 0) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "文件为空，请重新上传" }, 400);
    }

    // Magic bytes validation
    const header = file.buffer.slice(0, 4);
    const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46; // %PDF
    const isDocx = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04; // PK..

    if (!isPdf && !isDocx) {
      throw new HttpException({ code: ErrorCode.FILE_TYPE_UNSUPPORTED, message: "文件格式无效，仅支持 PDF 和 Word (.docx) 格式" }, 409);
    }

    const detectedType = isPdf ? "pdf" : "docx";
    const claimedType = ALLOWED_TYPES[file.mimetype];
    if (claimedType && claimedType !== detectedType) {
      throw new HttpException({ code: ErrorCode.FILE_TYPE_UNSUPPORTED, message: "文件扩展名与实际内容不符" }, 409);
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new HttpException({ code: ErrorCode.FILE_TOO_LARGE, message: "文件大小超过 5MB 限制" }, 413);
    }

    const fileType = claimedType || detectedType;

    const storagePath = process.env.RESUME_STORAGE_PATH || "./data/resumes";
    fs.mkdirSync(storagePath, { recursive: true });

    const fileId = uuid();
    const filePath = path.resolve(storagePath, `${fileId}.${fileType}`);
    fs.writeFileSync(filePath, file.buffer);

    const resume = await this.prisma.resume.create({
      data: {
        id: fileId,
        userId,
        filePath,
        fileNameOriginal: Buffer.from(file.originalname, "latin1").toString("utf8"),
        fileType,
        fileSize: file.size,
        parseStatus: "parsing",
      },
    });

    await this.parseQueue.add("parse", { resumeId: fileId }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });

    await this.cache.del(`cache:resumes:list:${userId}`);

    return {
      resumeId: resume.id,
      fileType: resume.fileType as "pdf" | "docx",
      parseStatus: "parsing",
      fileNameOriginal: resume.fileNameOriginal ?? file.originalname,
    };
  }

  async list(userId: string): Promise<ResumeItem[]> {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, fileNameOriginal: true, fileType: true,
        parseStatus: true, fileSize: true, freeAnalysisCount: true, createdAt: true,
        _count: { select: { analysisRecords: true } },
      },
    });
    return resumes.map((r) => ({
      id: r.id,
      fileNameOriginal: r.fileNameOriginal ?? "",
      fileType: r.fileType as "pdf" | "docx",
      parseStatus: r.parseStatus as ParseStatus,
      fileSize: r.fileSize ?? 0,
      freeAnalysisCount: r.freeAnalysisCount,
      analysisCount: r._count.analysisRecords,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async detail(id: string, userId: string): Promise<ResumeDetail> {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: { _count: { select: { analysisRecords: true } } },
    });
    if (!resume || resume.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }
    return {
      id: resume.id,
      fileNameOriginal: resume.fileNameOriginal ?? "",
      fileType: resume.fileType as "pdf" | "docx",
      parseStatus: resume.parseStatus as ParseStatus,
      fileSize: resume.fileSize ?? 0,
      freeAnalysisCount: resume.freeAnalysisCount,
      analysisCount: resume._count.analysisRecords,
      createdAt: resume.createdAt.toISOString(),
      parseResult: resume.parseResult as ParseResult | null,
      rawText: resume.rawText,
    };
  }

  async update(id: string, userId: string, body: { parseResult?: any; rawText?: string }): Promise<ResumeDetail> {
    const resume = await this.prisma.resume.findUnique({
      where: { id },
      include: { _count: { select: { analysisRecords: true } } },
    });
    if (!resume || resume.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }

    const data: any = {};
    if (body.parseResult !== undefined) data.parseResult = body.parseResult;
    if (body.rawText !== undefined) data.rawText = body.rawText;

    const hasChanges = (data.parseResult !== undefined && JSON.stringify(data.parseResult) !== JSON.stringify(resume.parseResult))
      || (data.rawText !== undefined && data.rawText !== resume.rawText);

    if (hasChanges) {
      await this.prisma.$transaction(async (tx) => {
        await tx.resumeVersion.create({
          data: { resumeId: id, parseResult: resume.parseResult ?? undefined, rawText: resume.rawText, source: "auto" },
        });
        await tx.resume.update({ where: { id }, data });
        await this.trimVersions(tx, id);
      });
      await this.cache.del(`cache:resumes:list:${userId}`);
    }

    const updated = await this.prisma.resume.findUnique({
      where: { id },
      include: { _count: { select: { analysisRecords: true } } },
    });

    return {
      id: updated!.id,
      fileNameOriginal: updated!.fileNameOriginal ?? "",
      fileType: updated!.fileType as "pdf" | "docx",
      parseStatus: updated!.parseStatus as ParseStatus,
      fileSize: updated!.fileSize ?? 0,
      freeAnalysisCount: updated!.freeAnalysisCount,
      analysisCount: updated!._count.analysisRecords,
      createdAt: updated!.createdAt.toISOString(),
      parseResult: updated!.parseResult as ParseResult | null,
      rawText: updated!.rawText,
    };
  }

  async listVersions(id: string, userId: string): Promise<ResumeVersionItem[]> {
    await this.requireOwnedResume(id, userId);
    const versions = await this.prisma.resumeVersion.findMany({ where: { resumeId: id }, orderBy: { createdAt: "desc" } });
    return versions.map((version) => this.versionItem(version));
  }

  async createVersion(id: string, userId: string, label?: string): Promise<ResumeVersionItem> {
    const resume = await this.requireOwnedResume(id, userId);
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.resumeVersion.create({
        data: { resumeId: id, parseResult: resume.parseResult ?? undefined, rawText: resume.rawText, source: "manual", label },
      });
      await this.trimVersions(tx, id);
      return this.versionItem(version);
    });
  }

  async versionDetail(id: string, versionId: string, userId: string): Promise<ResumeVersionDetail> {
    await this.requireOwnedResume(id, userId);
    const version = await this.prisma.resumeVersion.findFirst({ where: { id: versionId, resumeId: id } });
    if (!version) throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "版本不存在" }, 404);
    return { ...this.versionItem(version), parseResult: version.parseResult as ParseResult | null, rawText: version.rawText };
  }

  async restoreVersion(id: string, versionId: string, userId: string): Promise<ResumeDetail> {
    const resume = await this.requireOwnedResume(id, userId);
    const version = await this.prisma.resumeVersion.findFirst({ where: { id: versionId, resumeId: id } });
    if (!version) throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "版本不存在" }, 404);
    await this.prisma.$transaction(async (tx) => {
      await tx.resumeVersion.create({ data: { resumeId: id, parseResult: resume.parseResult ?? undefined, rawText: resume.rawText, source: "before_restore" } });
      await tx.resume.update({ where: { id }, data: { parseResult: version.parseResult ?? undefined, rawText: version.rawText } });
      await tx.resumeVersion.create({ data: { resumeId: id, parseResult: version.parseResult ?? undefined, rawText: version.rawText, source: "auto" } });
      await this.trimVersions(tx, id);
    });
    await this.cache.del(`cache:resumes:list:${userId}`);
    return this.detail(id, userId);
  }

  private async requireOwnedResume(id: string, userId: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume || resume.userId !== userId) throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    return resume;
  }

  private versionItem(version: { id: string; label: string | null; source: string; createdAt: Date }): ResumeVersionItem {
    return { id: version.id, label: version.label ?? undefined, source: version.source as VersionSource, createdAt: version.createdAt.toISOString() };
  }

  private async trimVersions(tx: any, resumeId: string): Promise<void> {
    const excess = await tx.resumeVersion.findMany({ where: { resumeId }, orderBy: { createdAt: "desc" }, skip: VERSION_LIMIT, select: { id: true } });
    if (excess.length > 0) await tx.resumeVersion.deleteMany({ where: { id: { in: excess.map((version: { id: string }) => version.id) } } });
  }

  async delete(id: string, userId: string): Promise<{ success: true }> {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume || resume.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }
    try { fs.unlinkSync(resume.filePath); } catch (e) {
      this.logger.warn(`Failed to delete resume file ${resume.filePath}: ${(e as Error).message}`);
    }
    await this.prisma.resume.delete({ where: { id } });
    await this.cache.del(`cache:resumes:list:${userId}`);
    return { success: true };
  }
}