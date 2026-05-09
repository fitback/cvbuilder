import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateJobRequest, CreateJobResponse, JobDescriptionItem, ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  async create(body: CreateJobRequest, userId: string): Promise<CreateJobResponse> {
    if (!body.title?.trim()) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "职位名称不能为空" }, 400);
    if (!body.content?.trim()) throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "JD内容不能为空" }, 400);

    const jd = await this.prisma.jobDescription.create({
      data: { userId, title: body.title, company: body.company, content: body.content },
    });
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

  async delete(id: string, userId: string): Promise<{ success: true }> {
    const jd = await this.prisma.jobDescription.findUnique({ where: { id } });
    if (!jd || jd.userId !== userId) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "JD不存在" }, 404);
    }
    await this.prisma.jobDescription.delete({ where: { id } });
    return { success: true };
  }
}