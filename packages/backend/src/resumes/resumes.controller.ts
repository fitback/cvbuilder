import { Controller, Post, Get, Param, Delete, Req, UseInterceptors, UploadedFile, UseGuards } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ResumesService } from "./resumes.service";
import { SessionGuard } from "../session/session.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { UploadResponse, ResumeItem, ResumeDetail } from "@cvbuilder/shared";

@Controller("resumes")
@UseGuards(SessionGuard)
@UseInterceptors(ApiResponseInterceptor)
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any): Promise<UploadResponse> {
    return this.resumesService.upload(file, req.sessionId);
  }

  @Get()
  async list(@Req() req: any): Promise<ResumeItem[]> {
    return this.resumesService.list(req.sessionId);
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Req() req: any): Promise<ResumeDetail> {
    return this.resumesService.detail(id, req.sessionId);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: any): Promise<{ success: true }> {
    return this.resumesService.delete(id, req.sessionId);
  }
}