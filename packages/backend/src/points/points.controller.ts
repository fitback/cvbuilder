import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { PointsService } from "./points.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";

@Controller("points")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get("balance")
  async getBalance(@Req() req: any) {
    return this.pointsService.getBalance(req.userId);
  }

  @Get("transactions")
  async getTransactions(
    @Req() req: any,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.pointsService.getTransactions(
      req.userId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 20,
    );
  }
}
