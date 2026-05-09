import { Controller, Post, Get, Delete, Param, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { SessionGuard } from "../session/session.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { CreateJobRequest, CreateJobResponse, JobDescriptionItem } from "@cvbuilder/shared";

@Controller("jobs")
@UseGuards(SessionGuard)
@UseInterceptors(ApiResponseInterceptor)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  async create(@Body() body: CreateJobRequest, @Req() req: any): Promise<CreateJobResponse> {
    return this.jobsService.create(body, req.sessionId);
  }

  @Get()
  async list(@Req() req: any): Promise<JobDescriptionItem[]> {
    return this.jobsService.list(req.sessionId);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: any): Promise<{ success: true }> {
    return this.jobsService.delete(id, req.sessionId);
  }
}