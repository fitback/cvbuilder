import { Injectable, HttpException, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../common/cache/cache.service";
import { UploadResponse, ErrorCode, ResumeItem, ResumeDetail } from "@cvbuilder/shared";
import { v4 as uuid } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { Queue } from "bullmq";
import { PARSE_QUEUE } from "./parse-queue.provider";

const ALLOWED_TYPES: Record<string, "pdf" | "docx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

@Injectable()
export class ResumesService {
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
      parseStatus: r.parseStatus as any,
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
      parseStatus: resume.parseStatus as any,
      fileSize: resume.fileSize ?? 0,
      freeAnalysisCount: resume.freeAnalysisCount,
      analysisCount: resume._count.analysisRecords,
      createdAt: resume.createdAt.toISOString(),
      parseResult: resume.parseResult as any,
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

    if (Object.keys(data).length > 0) {
      await this.prisma.resume.update({ where: { id }, data });
    }

    const updated = await this.prisma.resume.findUnique({
      where: { id },
      include: { _count: { select: { analysisRecords: true } } },
    });

    return {
      id: updated!.id,
      fileNameOriginal: updated!.fileNameOriginal ?? "",
      fileType: updated!.fileType as "pdf" | "docx",
      parseStatus: updated!.parseStatus as any,
      fileSize: updated!.fileSize ?? 0,
      freeAnalysisCount: updated!.freeAnalysisCount,
      analysisCount: updated!._count.analysisRecords,
      createdAt: updated!.createdAt.toISOString(),
      parseResult: updated!.parseResult as any,
      rawText: updated!.rawText,
    };
  }

  async delete(id: string, userId: string): Promise<{ success: true }> {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume || resume.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }
    try { fs.unlinkSync(resume.filePath); } catch (_) {}
    await this.prisma.resume.delete({ where: { id } });
    await this.cache.del(`cache:resumes:list:${userId}`);
    return { success: true };
  }
}