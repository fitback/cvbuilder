import { Controller, Post, Get, Body, Param, Req, UseGuards, UseInterceptors, HttpException } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode } from "@cvbuilder/shared";
import { CreateRechargeDto, RejectRechargeDto } from "./recharges.dto";

@Controller("recharges")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class RechargesController {
  constructor(
    private readonly rechargesService: RechargesService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async create(@Body() body: CreateRechargeDto, @Req() req: any) {
    return this.rechargesService.create(req.userId, body.amount, body.orderNo);
  }

  @Get()
  async listMine(@Req() req: any) {
    return this.rechargesService.listMine(req.userId);
  }

  @Get("pending")
  async listPending(@Req() req: any) {
    const user = await this.prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.role !== "admin") {
      throw new HttpException({ code: ErrorCode.UNAUTHORIZED, message: "无权操作" }, 401);
    }
    return this.rechargesService.listPending();
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Req() req: any) {
    return this.rechargesService.approve(id, req.userId);
  }

  @Post(":id/reject")
  async reject(@Param("id") id: string, @Body() body: RejectRechargeDto, @Req() req: any) {
    return this.rechargesService.reject(id, req.userId, body.note);
  }
}
