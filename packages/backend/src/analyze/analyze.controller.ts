import { Controller, Post, Get, Body, Param, Query, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { AnalyzeService } from "./analyze.service";
import { SessionGuard } from "../session/session.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { AnalyzeRequest, AnalyzeResponse, AnalysisHistoryItem, AnalysisDetail } from "@cvbuilder/shared";

@Controller("analyze")
@UseGuards(SessionGuard)
@UseInterceptors(ApiResponseInterceptor)
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Post()
  async analyze(@Body() body: AnalyzeRequest, @Req() req: any): Promise<AnalyzeResponse> {
    return this.analyzeService.analyze(body, req.sessionId);
  }

  @Get()
  async listByResume(@Query("resumeId") resumeId: string, @Req() req: any): Promise<AnalysisHistoryItem[]> {
    return this.analyzeService.listByResume(resumeId, req.sessionId);
  }

  @Get(":id")
  async getDetail(@Param("id") id: string, @Req() req: any): Promise<AnalysisDetail> {
    return this.analyzeService.getDetail(id, req.sessionId);
  }
}