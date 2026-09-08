import { Controller, Post, Get, Put, Delete, Param, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JobsService } from "./jobs.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { CacheService } from "../common/cache/cache.service";
import { CreateJobResponse, JobDescriptionDetail, JobDescriptionItem } from "@cvbuilder/shared";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";

@Controller("jobs")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly cache: CacheService,
  ) {}

  @Post()
  async create(@Body() body: CreateJobDto, @Req() req: any): Promise<CreateJobResponse> {
    return this.jobsService.create(body, req.userId);
  }

  @Get()
  async list(@Req() req: any): Promise<JobDescriptionItem[]> {
    return this.cache.getOrSet(`cache:jobs:list:${req.userId}`, 30, () =>
      this.jobsService.list(req.userId)
    );
  }

  @Get(":id")
  async detail(@Param("id") id: string, @Req() req: any): Promise<JobDescriptionDetail> {
    return this.cache.getOrSet(`cache:jobs:${id}`, 60, () =>
      this.jobsService.detail(id, req.userId)
    );
  }

  @Put(":id")
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateJobDto,
    @Req() req: any,
  ): Promise<JobDescriptionDetail> {
    return this.jobsService.update(id, req.userId, body);
  }

  @Delete(":id")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async delete(@Param("id") id: string, @Req() req: any): Promise<{ success: true }> {
    return this.jobsService.delete(id, req.userId);
  }
}