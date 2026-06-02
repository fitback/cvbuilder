import { Controller, Post, Get, Body, Param, Req, UseGuards, UseInterceptors, HttpException } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { ErrorCode } from "@cvbuilder/shared";

const ALLOWED_PLANS = [10, 20, 50];

@Controller("recharges")
@UseInterceptors(ApiResponseInterceptor)
export class RechargesController {
  constructor(private readonly rechargesService: RechargesService) {}

  @Post("orders")
  @UseGuards(AuthGuard)
  async createOrder(@Body() body: { amount: number }, @Req() req: any) {
    if (!ALLOWED_PLANS.includes(body.amount)) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "无效的充值金额" }, 400);
    }
    return this.rechargesService.createOrder(req.userId, body.amount);
  }

  // Alipay callback (public, no auth, x-www-form-urlencoded)
  @Post("notify")
  async notify(@Body() body: Record<string, string>) {
    return this.rechargesService.handleNotify(body);
  }

  // User: list own recharge records
  @Get()
  @UseGuards(AuthGuard)
  async listMine(@Req() req: any) {
    return this.rechargesService.listMine(req.userId);
  }

  // Admin: list all recharge records
  @Get("all")
  @UseGuards(AuthGuard, AdminGuard)
  async listAll() {
    return this.rechargesService.listAll();
  }

  // Query order status (polled by frontend)
  @Get("status/:outTradeNo")
  @UseGuards(AuthGuard)
  async queryStatus(@Param("outTradeNo") outTradeNo: string, @Req() req: any) {
    return this.rechargesService.getStatus(outTradeNo, req.userId);
  }
}
