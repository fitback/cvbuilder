import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { UserAwareThrottlerGuard } from "./common/throttler/user-aware-throttler.guard";
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

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    PrismaModule, AuthModule, ResumesModule, JobsModule,
    AnalyzeModule, GenerateModule, ExportModule,
    PointsModule, RechargesModule, GeneratedResumesModule, PaymentModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: UserAwareThrottlerGuard },
  ],
})
export class AppModule {}