import { Controller, Post, Get, Put, Body, Param, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { GenerateService } from "./generate.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { GenerateRequest, GenerateResponse } from "@cvbuilder/shared";

@Controller("generate")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class GenerateController {
  constructor(private readonly generateService: GenerateService) {}

  @Post()
  async generate(@Body() body: GenerateRequest, @Req() req: any): Promise<GenerateResponse> {
    return this.generateService.generate(body, req.userId);
  }

  @Get(":analysisRecordId")
  async getGenerated(@Param("analysisRecordId") analysisRecordId: string, @Req() req: any) {
    return this.generateService.getGenerated(analysisRecordId, req.userId);
  }

  @Put(":analysisRecordId")
  async saveEdited(@Param("analysisRecordId") analysisRecordId: string, @Body() body: { markdown: string }, @Req() req: any) {
    return this.generateService.saveEdited(analysisRecordId, body.markdown, req.userId);
  }
}
