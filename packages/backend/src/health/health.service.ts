import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { readFileSync } from "fs";
import { join } from "path";

export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  checks: Record<string, { status: string; message: string; latency?: number }>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const checks: HealthStatus["checks"] = {};
    let overall: HealthStatus["status"] = "ok";

    // 1. Database
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: "ok", message: "PostgreSQL connected", latency: Date.now() - dbStart };
    } catch (err: any) {
      checks.database = { status: "down", message: err.message };
      overall = "down";
    }

    // 2. Redis (BullMQ)
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      checks.redis = { status: "ok", message: "Redis configured" };
    } catch {
      checks.redis = { status: "down", message: "Redis not configured" };
    }

    // 3. DeepSeek config
    const dsKey = process.env.DEEPSEEK_API_KEY;
    const dsModel = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    if (dsKey && dsKey.length > 10) {
      checks.deepseek = { status: "ok", message: `Model: ${dsModel}` };
    } else {
      checks.deepseek = { status: "degraded", message: "DEEPSEEK_API_KEY not set or too short" };
      if (overall === "ok") overall = "degraded";
    }

    // 4. Prompts
    try {
      const analyzePath = join(__dirname, "../../prompts/analyze-master.md");
      const genPath = join(__dirname, "../../prompts/generate-master.md");
      readFileSync(analyzePath, "utf-8");
      readFileSync(genPath, "utf-8");
      checks.prompts = { status: "ok", message: "analyze-master + generate-master found" };
    } catch {
      checks.prompts = { status: "down", message: "Prompt files missing" };
      if (overall === "ok") overall = "degraded";
    }

    // 5. Puppeteer
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    try {
      const puppeteer = await import("puppeteer-core");
      const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: ["--no-sandbox", "--disable-gpu"],
      });
      await browser.close();
      checks.puppeteer = { status: "ok", message: "Chrome available" };
    } catch (err: any) {
      checks.puppeteer = { status: "down", message: `Chrome unavailable: ${err.message}` };
      if (overall === "ok") overall = "degraded";
    }

    // 6. Alipay config
    const alipayAppId = process.env.ALIPAY_APP_ID;
    checks.alipay = alipayAppId
      ? { status: "ok", message: "Configured" }
      : { status: "degraded", message: "ALIPAY_APP_ID not set" };

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }
}
