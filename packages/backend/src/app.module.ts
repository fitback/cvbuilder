import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ResumesModule } from "./resumes/resumes.module";
import { JobsModule } from "./jobs/jobs.module";
import { AnalyzeModule } from "./analyze/analyze.module";
import { GenerateModule } from "./generate/generate.module";
import { ExportModule } from "./export/export.module";
import { PointsModule } from "./points/points.module";
import { RechargesModule } from "./recharges/recharges.module";

@Module({
  imports: [
    PrismaModule, AuthModule, ResumesModule, JobsModule,
    AnalyzeModule, GenerateModule, ExportModule,
    PointsModule, RechargesModule,
  ],
})
export class AppModule {}