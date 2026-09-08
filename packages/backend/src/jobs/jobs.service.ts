import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../common/cache/cache.service";
import { CreateJobRequest, CreateJobResponse, JobDescriptionItem, JobDescriptionDetail, UpdateJobRequest, ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async create(body: CreateJobRequest, userId: string): Promise<CreateJobResponse> {
    if (!body.title?.trim()) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "职位名称不能为空" }, 400);
    if (!body.content?.trim()) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "JD内容不能为空" }, 400);

    const jd = await this.prisma.jobDescription.create({
      data: { userId, title: body.title, company: body.company, content: body.content },
    });
    await this.cache.del(`cache:jobs:list:${userId}`);
    return { jobDescriptionId: jd.id };
  }

  async list(userId: string): Promise<JobDescriptionItem[]> {
    const jobs = await this.prisma.jobDescription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, company: true, createdAt: true },
    });
    return jobs.map((j) => ({ ...j, company: j.company ?? undefined, createdAt: j.createdAt.toISOString() }));
  }

  async detail(id: string, userId: string): Promise<JobDescriptionDetail> {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } });
    if (!jd || jd.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "JD不存在" }, 404);
    }
    return { id: jd.id, title: jd.title, company: jd.company ?? undefined, content: jd.content, createdAt: jd.createdAt.toISOString() };
  }

  async update(id: string, userId: string, body: UpdateJobRequest): Promise<JobDescriptionDetail> {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } });
    if (!jd || jd.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "JD不存在" }, 404);
    }

    // Validate non-empty fields if provided
    if (body.title !== undefined && !body.title.trim()) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "职位名称不能为空" }, 400);
    }
    if (body.content !== undefined && !body.content.trim()) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "JD内容不能为空" }, 400);
    }

    const data: { title?: string; company?: string | null; content?: string } = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.company !== undefined) data.company = body.company || null;
    if (body.content !== undefined) data.content = body.content;

    const updated = await this.prisma.jobDescription.update({ where: { id }, data });
    await this.cache.del(`cache:jobs:list:${userId}`);
    await this.cache.del(`cache:jobs:${id}`);
    return { id: updated.id, title: updated.title, company: updated.company ?? undefined, content: updated.content, createdAt: updated.createdAt.toISOString() };
  }

  async delete(id: string, userId: string): Promise<{ success: true }> {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } });
    if (!jd || jd.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "JD不存在" }, 404);
    }
    await this.prisma.jobDescription.delete({ where: { id } });
    await this.cache.del(`cache:jobs:list:${userId}`);
    await this.cache.del(`cache:jobs:${id}`);
    return { success: true };
  }
}