import { Module } from "@nestjs/common";
import { GeneratedResumesController } from "./generated-resumes.controller";
import { GeneratedResumesService } from "./generated-resumes.service";

@Module({
  controllers: [GeneratedResumesController],
  providers: [GeneratedResumesService],
})
export class GeneratedResumesModule {}
