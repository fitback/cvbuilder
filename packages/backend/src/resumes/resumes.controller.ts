import { Controller, Post, Get, Put, Param, Body, Delete, Req, UseInterceptors, UploadedFile, UseGuards } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { ResumesService } from "./resumes.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { UploadResponse, ResumeItem, ResumeDetail } from "@cvbuilder/shared";

@Controller("resumes")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post("upload")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any): Promise<UploadResponse> {
    return this.resumesService.upload(file, req.userId);
  }

  @Get()
  async list(@Req() req: any): Promise<ResumeItem[]> {
    return this.resumesService.list(req.userId);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Req() req: any): Promise<ResumeDetail> {
    return this.resumesService.detail(id, req.userId);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: { parseResult?: any; rawText?: string },
    @Req() req: any,
  ): Promise<ResumeDetail> {
    return this.resumesService.update(id, req.userId, body);
  }

  @Delete(":id")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async delete(@Param("id") id: string, @Req() req: any): Promise<{ success: true }> {
    return this.resumesService.delete(id, req.userId);
  }
}