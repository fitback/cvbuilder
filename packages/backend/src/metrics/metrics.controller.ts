import { Controller, Get, OnModuleInit, Inject, forwardRef, Optional } from "@nestjs/common";
import { PARSE_QUEUE } from "../resumes/parse-queue.provider";
import { PrismaService } from "../prisma/prisma.service";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { type Gauge, register as defaultRegistry } from "prom-client";
import { Queue } from "bullmq";

/**
 * Exposes the default Prometheus registry at GET /metrics (collecting process
 * metrics + custom business gauges defined in MetricsModule). Business gauges
 * are refreshed inline before each scrape so values stay fresh without needing
 * a separate refresh endpoint.
 */
@Controller()
export class MetricsController implements OnModuleInit {
  constructor(
    @Inject(PARSE_QUEUE) private parseQueue: Queue,
    private prisma: PrismaService,
    @InjectMetric("resume_total") private resumeGauge: Gauge<string>,
    @InjectMetric("generated_resume_total") private genResumeGauge: Gauge,
    @InjectMetric("analysis_total") private analysisGauge: Gauge,
    @InjectMetric("recharge_total") private rechargeGauge: Gauge<string>,
    @InjectMetric("user_total") private userGauge: Gauge,
    @InjectMetric("parse_queue_depth") private queueGauge: Gauge<string>,
  ) {}

  onModuleInit() {
    // nestjs-prometheus registers custom gauges on the global `register` from
    // prom-client; collectDefaultMetrics also writes there. We just call
    // .metrics() on it to dump everything as Prometheus text format.
  }

  @Get("metrics")
  async metrics(): Promise<string> {
    await this.refresh();
    return defaultRegistry.metrics();
  }

  private async refresh(): Promise<void> {
    await Promise.all([
      this.refreshResumeGauge(),
      this.refreshGenResumeGauge(),
      this.refreshAnalysisGauge(),
      this.refreshRechargeGauge(),
      this.refreshUserGauge(),
      this.refreshQueueGauge(),
    ]);
  }

  private async refreshResumeGauge() {
    try {
      const rows = await this.prisma.resume.groupBy({ by: ["parseStatus"], _count: true });
      this.resumeGauge.reset();
      for (const r of rows) this.resumeGauge.set({ status: r.parseStatus }, r._count);
    } catch { /* DB not ready yet — gauge stays at 0 */ }
  }

  private async refreshGenResumeGauge() {
    try { this.genResumeGauge.set(await this.prisma.generatedResume.count()); } catch {}
  }

  private async refreshAnalysisGauge() {
    try { this.analysisGauge.set(await this.prisma.analysisRecord.count()); } catch {}
  }

  private async refreshRechargeGauge() {
    try {
      const rows = await this.prisma.rechargeRecord.groupBy({ by: ["status"], _count: true });
      this.rechargeGauge.reset();
      for (const r of rows) this.rechargeGauge.set({ status: r.status }, r._count);
    } catch {}
  }

  private async refreshUserGauge() {
    try { this.userGauge.set(await this.prisma.user.count()); } catch {}
  }

  private async refreshQueueGauge() {
    try {
      const counts = await this.parseQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
      this.queueGauge.reset();
      this.queueGauge.set({ state: "waiting" }, counts.waiting);
      this.queueGauge.set({ state: "active" }, counts.active);
      this.queueGauge.set({ state: "completed" }, counts.completed);
      this.queueGauge.set({ state: "failed" }, counts.failed);
      this.queueGauge.set({ state: "delayed" }, counts.delayed);
    } catch {}
  }
}
