import { Module } from "@nestjs/common";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";
import { TemplatesModule } from "../templates/templates.module";

@Module({
  imports: [TemplatesModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
