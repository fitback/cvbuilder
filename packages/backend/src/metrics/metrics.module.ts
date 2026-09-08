import { Module } from "@nestjs/common";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import * as promClient from "prom-client";
import { MetricsController } from "./metrics.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { ResumesModule } from "../resumes/resumes.module";

/**
 * Exposes GET /metrics → Prometheus text format with process metrics +
 * business gauges (resume/analysis/recharge/user counts, BullMQ queue depth).
 *
 * Gauges refresh inline before each scrape, so values stay fresh.
 */
@Module({
  imports: [PrismaModule, ResumesModule],
  controllers: [MetricsController],
  providers: [
    // Register default process metrics (CPU, memory, event loop) on the global
    // registry so MetricsController.metrics() can serve them.
    {
      provide: "PROM_DEFAULT_METRICS",
      useFactory: () => {
        promClient.collectDefaultMetrics({ labels: { app: "resumematcher-backend" } });
        return true;
      },
    },
    makeGaugeProvider({ name: "resume_total", help: "Resume count by parseStatus", labelNames: ["status"] }),
    makeGaugeProvider({ name: "generated_resume_total", help: "GeneratedResume total count" }),
    makeGaugeProvider({ name: "analysis_total", help: "AnalysisRecord total count" }),
    makeGaugeProvider({ name: "recharge_total", help: "RechargeRecord count by status", labelNames: ["status"] }),
    makeGaugeProvider({ name: "user_total", help: "User total count" }),
    makeGaugeProvider({ name: "parse_queue_depth", help: "BullMQ resume-parse queue depth by state", labelNames: ["state"] }),
  ],
  exports: [],
})
export class MetricsModule {}

