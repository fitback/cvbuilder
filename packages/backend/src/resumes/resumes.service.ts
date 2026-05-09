import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UploadResponse, ErrorCode, ResumeItem, ResumeDetail } from "@cvbuilder/shared";
import { v4 as uuid } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { Inject } from "@nestjs/common";
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
    @Inject(PARSE_QUEUE) private parseQueue: Queue,
  ) {}

  async upload(file: Express.Multer.File, userId: string): Promise<UploadResponse> {
    if (!file) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "No file provided" }, 400);

    const fileType = ALLOWED_TYPES[file.mimetype];
    if (!fileType) throw new HttpException({ code: ErrorCode.FILE_TYPE_UNSUPPORTED, message: "仅支持 PDF 和 Word 格式" }, 409);

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

  async delete(id: string, userId: string): Promise<{ success: true }> {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume || resume.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }
    try { fs.unlinkSync(resume.filePath); } catch (_) {}
    await this.prisma.resume.delete({ where: { id } });
    return { success: true };
  }
}