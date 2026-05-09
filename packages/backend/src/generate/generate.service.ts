import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
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
  constructor(private prisma: PrismaService) {}

  async generate(body: GenerateRequest, sessionId: string): Promise<GenerateResponse> {
    const resume = await this.prisma.resume.findUnique({ where: { id: body.resumeId } });
    if (!resume || resume.sessionId !== sessionId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "简历不存在" }, 404);
    }
    if (!resume.parseResult) {
      throw new HttpException({ code: ErrorCode.PARSE_FAILED, message: "简历尚未解析完成" }, 422);
    }

    const analysis = await this.prisma.analysisRecord.findUnique({ where: { id: body.analysisRecordId } });
    if (!analysis || analysis.sessionId !== sessionId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "分析记录不存在" }, 404);
    }
    if (!analysis.analysisResult) {
      throw new HttpException({ code: ErrorCode.PARSE_FAILED, message: "分析尚未完成" }, 422);
    }

    const analysisResult = analysis.analysisResult as any;

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

      return {
        markdown,
        resumeId: body.resumeId,
        analysisRecordId: body.analysisRecordId,
      };
    } catch {
      throw new HttpException({ code: ErrorCode.AI_SERVICE_UNAVAILABLE, message: "AI服务暂时不可用，请稍后重试" }, 503);
    }
  }
}
