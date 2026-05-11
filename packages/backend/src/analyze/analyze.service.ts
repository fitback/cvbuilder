import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PointsService } from "../points/points.service";
import { AnalyzeRequest, AnalyzeResponse, AnalysisHistoryItem, AnalysisDetail, ErrorCode } from "@cvbuilder/shared";
import { CircuitBreaker } from "./circuit-breaker";
import { readFileSync } from "fs";
import { join } from "path";

const ANALYZE_PROMPT = readFileSync(join(__dirname, "../../prompts/analyze-master.md"), "utf-8");

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

const breaker = new CircuitBreaker(5, 60000);

async function callDeepSeek(messages: any[], temperature = 0.3): Promise<any> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(`${DEEPSEEK_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_KEY}` },
        body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, temperature, response_format: { type: "json_object" } }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`DeepSeek returned ${res.status}`);
      const data = await res.json() as any;
      return JSON.parse(data.choices[0].message.content);
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError ?? new Error("DeepSeek call failed");
}

@Injectable()
export class AnalyzeService {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
  ) {}

  async analyze(body: AnalyzeRequest, userId: string): Promise<AnalyzeResponse> {
    const resume = await this.prisma.resume.findUnique({ where: { id: body.resumeId } });
    if (!resume || resume.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }
    if (resume.parseStatus !== "parsed" || !resume.parseResult) {
      throw new HttpException({ code: ErrorCode.PARSE_FAILED, message: "简历尚未解析完成" }, 422);
    }

    const jd = await this.prisma.jobDescription.findUnique({ where: { id: body.jobDescriptionId } });
    if (!jd || jd.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "JD不存在" }, 404);
    }

    // Idempotency
    const existing = await this.prisma.analysisRecord.findUnique({
      where: { resumeId_jobDescriptionId: { resumeId: body.resumeId, jobDescriptionId: body.jobDescriptionId } },
    });
    if (existing?.analysisResult) {
      const result = existing.analysisResult as any;
      return {
        analysisRecordId: existing.id,
        matchScore: existing.matchScore ?? 0,
        jdCoreDecoding: result.jdCoreDecoding ?? [],
        optimizationSuggestions: result.optimizationSuggestions ?? [],
        detailChecklist: result.detailChecklist ?? [],
      };
    }

    // Admin users bypass quota
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      await this.points.deduct(userId, 30, "AI分析", body.resumeId);
    }

    try {
      const analysisResult = await breaker.call(() =>
        callDeepSeek([
          { role: "system", content: ANALYZE_PROMPT },
          { role: "user", content: `简历JSON：${JSON.stringify(resume.parseResult)}\n\nJD内容：${jd.content}` },
        ]),
      );

      const record = await this.prisma.analysisRecord.upsert({
        where: { resumeId_jobDescriptionId: { resumeId: body.resumeId, jobDescriptionId: body.jobDescriptionId } },
        create: {
          userId, resumeId: body.resumeId, jobDescriptionId: body.jobDescriptionId,
          analysisResult, matchScore: analysisResult.matchScore,
        },
        update: { analysisResult, matchScore: analysisResult.matchScore },
      });

      return {
        analysisRecordId: record.id,
        matchScore: analysisResult.matchScore,
        jdCoreDecoding: analysisResult.jdCoreDecoding ?? [],
        optimizationSuggestions: analysisResult.optimizationSuggestions ?? [],
        detailChecklist: analysisResult.detailChecklist ?? [],
      };
    } catch (err) {
      if (!isAdmin) {
        await this.points.refund(userId, 30, "AI分析失败退还", body.resumeId);
      }
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "AI服务暂时不可用，请稍后重试" }, 503);
    }
  }

  async listByResume(resumeId: string, userId: string): Promise<AnalysisHistoryItem[]> {
    const records = await this.prisma.analysisRecord.findMany({
      where: { resumeId, userId },
      include: { jobDescription: { select: { title: true, company: true } } },
      orderBy: { createdAt: "desc" },
    });
    return records.filter((r) => r.analysisResult != null).map((r) => ({
      id: r.id,
      matchScore: r.matchScore ?? 0,
      jdTitle: r.jobDescription.title,
      jdCompany: r.jobDescription.company ?? "",
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async listSaved(userId: string) {
    const records = await this.prisma.analysisRecord.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        resume: { select: { fileNameOriginal: true } },
        jobDescription: { select: { title: true, company: true } },
      },
    });
    return records
      .filter((r) => {
        const ar = r.analysisResult as any;
        return ar?.editedResume;
      })
      .map((r) => ({
        analysisRecordId: r.id,
        resumeId: r.resumeId,
        resumeFileName: r.resume.fileNameOriginal ?? "",
        jdTitle: r.jobDescription.title,
        jdCompany: r.jobDescription.company ?? undefined,
        matchScore: r.matchScore ?? 0,
        savedAt: r.updatedAt.toISOString(),
      }));
  }

  async getDetail(id: string, userId: string): Promise<AnalysisDetail> {
    const record = await this.prisma.analysisRecord.findUnique({ where: { id } });
    if (!record || record.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "分析记录不存在" }, 404);
    }
    const result = record.analysisResult as any;
    return {
      analysisRecordId: record.id,
      matchScore: record.matchScore ?? 0,
      matchSummary: result?.matchSummary ?? "",
      jdCoreDecoding: result?.jdCoreDecoding ?? [],
      optimizationSuggestions: result?.optimizationSuggestions ?? [],
      detailChecklist: result?.detailChecklist ?? [],
    };
  }
}