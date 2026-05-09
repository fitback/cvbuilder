import { Module } from "@nestjs/common";
import { ResumesController } from "./resumes.controller";
import { ResumesService } from "./resumes.service";
import { parseQueueProvider } from "./parse-queue.provider";

@Module({
  controllers: [ResumesController],
  providers: [ResumesService, parseQueueProvider],
  exports: [ResumesService],
})
export class ResumesModule {}