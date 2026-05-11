import { Controller, Post, Get, Body, Param, Query, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnalyzeService } from "./analyze.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { AnalyzeRequest, AnalyzeResponse, AnalysisHistoryItem, AnalysisDetail } from "@cvbuilder/shared";

@Controller("analyze")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post()
  async analyze(@Body() body: AnalyzeRequest, @Req() req: any): Promise<AnalyzeResponse> {
    return this.analyzeService.analyze(body, req.userId);
  }

  @Get("saved")
  async listSaved(@Req() req: any) {
    return this.analyzeService.listSaved(req.userId);
  }

  @Get()
  async listByResume(@Query("resumeId") resumeId: string, @Req() req: any): Promise<AnalysisHistoryItem[]> {
    return this.analyzeService.listByResume(resumeId, req.userId);
  }

  @Get(":id")
  async getDetail(@Param("id") id: string, @Req() req: any): Promise<AnalysisDetail> {
    return this.analyzeService.getDetail(id, req.userId);
  }
}