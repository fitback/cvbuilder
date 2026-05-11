import { Controller, Post, Body, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { ExportService } from "./export.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("export")
@UseGuards(AuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post("pdf")
  async exportPdf(@Body() body: { markdown: string }, @Res() res: Response) {
    const pdf = await this.exportService.exportPdf(body.markdown);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="resume.pdf"',
      "Content-Length": pdf.length.toString(),
    });
    res.send(pdf);
  }
}
