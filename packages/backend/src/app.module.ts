import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { UserAwareThrottlerGuard } from "./common/throttler/user-aware-throttler.guard";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ResumesModule } from "./resumes/resumes.module";
import { JobsModule } from "./jobs/jobs.module";
import { AnalyzeModule } from "./analyze/analyze.module";
import { GenerateModule } from "./generate/generate.module";
import { ExportModule } from "./export/export.module";
import { PointsModule } from "./points/points.module";
import { RechargesModule } from "./recharges/recharges.module";
import { GeneratedResumesModule } from "./generated-resumes/generated-resumes.module";
import { PaymentModule } from "./payment/payment.module";
import { HealthModule } from "./health/health.module";
import { CacheModule } from "./common/cache/cache.module";
import { MetricsModule } from "./metrics/metrics.module";

const isProd = process.env.NODE_ENV === "production";

@Module({
  imports: [
    // Structured JSON logs in production; pretty-printed in dev for readability.
    // requestId is auto-propagated via pino-http's x-request-id header (generated
    // if absent) so all log lines for one request share an id.
    LoggerModule.forRoot({
      pinoHttp: {
        level: isProd ? "info" : "debug",
        transport: isProd
          ? undefined
          : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" } },
        genReqId: (req) => (req.headers["x-request-id"] as string) || crypto.randomUUID(),
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "res.headers['set-cookie']",
          ],
          remove: true,
        },
        serializers: {
          req(req: any) {
            return { id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress };
          },
        },
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    CacheModule,
    PrismaModule, AuthModule, ResumesModule, JobsModule,
    AnalyzeModule, GenerateModule, ExportModule,
    PointsModule, RechargesModule, GeneratedResumesModule, PaymentModule,
    HealthModule, MetricsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: UserAwareThrottlerGuard },
  ],
})
export class AppModule {}