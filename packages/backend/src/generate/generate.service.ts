import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PointsService } from "../points/points.service";
import { GenerateRequest, GenerateResponse, ErrorCode } from "@cvbuilder/shared";
import { CircuitBreaker } from "../analyze/circuit-breaker";
import { readFileSync } from "fs";
import { join } from "path";

const GENERATE_PROMPT = readFileSync(join(__dirname, "../../prompts/generate-master.md"), "utf-8");

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

const breaker = new CircuitBreaker(5, 60000);

async function callDeepSeek(messages: any[], temperature = 0.4): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const res = await fetch(`${DEEPSEEK_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_KEY}` },
        body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, temperature }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`DeepSeek returned ${res.status}`);
      const data = await res.json() as any;
      return data.choices[0].message.content;
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError ?? new Error("DeepSeek call failed");
}

@Injectable()
export class GenerateService {
  constructor(
    private prisma: PrismaService,
    private points: PointsService,
  ) {}

  async generate(body: GenerateRequest, userId: string): Promise<GenerateResponse> {
    const resume = await this.prisma.resume.findUnique({ where: { id: body.resumeId } });
    if (!resume || resume.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }
    if (!resume.parseResult) {
      throw new HttpException({ code: ErrorCode.PARSE_FAILED, message: "简历尚未解析完成" }, 422);
    }

    const analysis = await this.prisma.analysisRecord.findUnique({ where: { id: body.analysisRecordId } });
    if (!analysis || analysis.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "分析记录不存在" }, 404);
    }
    if (!analysis.analysisResult) {
      throw new HttpException({ code: ErrorCode.PARSE_FAILED, message: "分析尚未完成" }, 422);
    }

    const analysisResult = analysis.analysisResult as any;

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      await this.points.deduct(userId, 50, "生成简历", body.resumeId);
    }

    try {
      const markdown = await breaker.call(() =>
        callDeepSeek([
          { role: "system", content: GENERATE_PROMPT },
          {
            role: "user",
            content: `优化建议：${JSON.stringify(analysisResult.optimizationSuggestions ?? [])}\n\n排雷清单：${JSON.stringify(analysisResult.detailChecklist ?? [])}\n\n原始简历JSON：${JSON.stringify(resume.parseResult)}`,
          },
        ]),
      );

      // Persist generated markdown in analysisResult
      await this.prisma.analysisRecord.update({
        where: { id: body.analysisRecordId },
        data: { analysisResult: { ...analysisResult, generatedResume: markdown } },
      });

      return {
        markdown,
        resumeId: body.resumeId,
        analysisRecordId: body.analysisRecordId,
      };
    } catch {
      if (!isAdmin) {
        await this.points.refund(userId, 50, "生成失败退还", body.resumeId).catch(() => {});
      }
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "AI服务暂时不可用，请稍后重试" }, 503);
    }
  }

  async getGenerated(analysisRecordId: string, userId: string) {
    const analysis = await this.prisma.analysisRecord.findUnique({ where: { id: analysisRecordId } });
    if (!analysis || analysis.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "分析记录不存在" }, 404);
    }
    const result = analysis.analysisResult as any;
    if (!result?.generatedResume) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "尚未生成简历" }, 404);
    }
    return { markdown: result.generatedResume, analysisRecordId };
  }
}
