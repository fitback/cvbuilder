import { Controller, Post, Get, Put, Delete, Param, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { GeneratedResumesService } from "./generated-resumes.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { GeneratedResumeItem, GeneratedResumeDetail, CreateGeneratedResumeRequest, UpdateGeneratedResumeRequest } from "@cvbuilder/shared";

@Controller("generated-resumes")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class GeneratedResumesController {
  constructor(private readonly service: GeneratedResumesService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateGeneratedResumeRequest): Promise<GeneratedResumeItem> {
    return this.service.create(req.userId, dto);
  }

  @Get()
  async list(@Req() req: any): Promise<GeneratedResumeItem[]> {
    return this.service.list(req.userId);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Req() req: any): Promise<GeneratedResumeDetail> {
    return this.service.detail(id, req.userId);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Req() req: any,
    @Body() dto: UpdateGeneratedResumeRequest,
  ): Promise<GeneratedResumeItem> {
    return this.service.update(id, req.userId, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: any): Promise<{ success: true }> {
    return this.service.delete(id, req.userId);
  }
}
