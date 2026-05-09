import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ResumesModule } from "./resumes/resumes.module";
import { JobsModule } from "./jobs/jobs.module";
import { AnalyzeModule } from "./analyze/analyze.module";
import { GenerateModule } from "./generate/generate.module";
import { ExportModule } from "./export/export.module";

@Module({
  imports: [PrismaModule, ResumesModule, JobsModule, AnalyzeModule, GenerateModule, ExportModule],
})
export class AppModule {}