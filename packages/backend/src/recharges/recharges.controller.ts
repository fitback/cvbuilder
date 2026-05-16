import { Controller, Post, Get, Body, Param, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { CreateRechargeDto, RejectRechargeDto } from "./recharges.dto";

@Controller("recharges")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class RechargesController {
  constructor(private readonly rechargesService: RechargesService) {}

  @Post()
  async create(@Body() body: CreateRechargeDto, @Req() req: any) {
    return this.rechargesService.create(req.userId, body.amount, body.orderNo);
  }

  @Get()
  async listMine(@Req() req: any) {
    return this.rechargesService.listMine(req.userId);
  }

  @Get("pending")
  @UseGuards(AdminGuard)
  async listPending() {
    return this.rechargesService.listPending();
  }

  @Get("history")
  @UseGuards(AdminGuard)
  async listHistory(@Req() req: any) {
    return this.rechargesService.listHistory();
  }

  @Post(":id/approve")
  @UseGuards(AdminGuard)
  async approve(@Param("id") id: string, @Req() req: any) {
    return this.rechargesService.approve(id, req.userId);
  }

  @Post(":id/reject")
  @UseGuards(AdminGuard)
  async reject(@Param("id") id: string, @Body() body: RejectRechargeDto, @Req() req: any) {
    return this.rechargesService.reject(id, req.userId, body.note);
  }
}
