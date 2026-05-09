import { Controller, Post, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
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
}
