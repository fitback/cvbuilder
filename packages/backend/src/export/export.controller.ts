import { Controller, Post, Body, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Response } from "express";
import { ExportService } from "./export.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { ExportDto, PreviewDto } from "./dto/export.dto";

@Controller("export")
@UseGuards(AuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post("pdf")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async exportPdf(@Body() body: ExportDto, @Res() res: Response) {
    const pdf = await this.exportService.exportPdf(body.markdown, body.templateId, body.structured);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="resume.pdf"',
      "Content-Length": pdf.length.toString(),
    });
    res.send(pdf);
  }

  @Post("docx")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async exportDocx(@Body() body: ExportDto, @Res() res: Response) {
    const docx = await this.exportService.exportDocx(body.markdown);
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="resume.docx"',
      "Content-Length": docx.length.toString(),
    });
    res.send(docx);
  }

  /**
   * Preview endpoint — returns the same HTML that PDF export would render,
   * so the frontend iframe shows a 1:1 preview. Lighter than PDF (no puppeteer).
   */
  @Post("preview")
  @UseInterceptors(ApiResponseInterceptor)
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  preview(@Body() body: PreviewDto) {
    const html = this.exportService.renderHtml(body.markdown, body.templateId, body.structured);
    return { html };
  }
}
