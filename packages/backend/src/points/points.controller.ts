import { Controller, Get, Query, Req, UseGuards, UseInterceptors, ParseIntPipe } from "@nestjs/common";
import { PointsService } from "./points.service";
import { AuthGuard } from "../auth/auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { CacheService } from "../common/cache/cache.service";

@Controller("points")
@UseGuards(AuthGuard)
@UseInterceptors(ApiResponseInterceptor)
export class PointsController {
  constructor(
    private readonly pointsService: PointsService,
    private readonly cache: CacheService,
  ) {}

  @Get("balance")
  async getBalance(@Req() req: any) {
    return this.cache.getOrSet(`cache:points:${req.userId}`, 5, () =>
      this.pointsService.getBalance(req.userId)
    );
  }

  @Get("transactions")
  async getTransactions(
    @Req() req: any,
    @Query("page", new ParseIntPipe({ optional: true })) page?: number,
    @Query("pageSize", new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.pointsService.getTransactions(
      req.userId,
      page ?? 1,
      pageSize ?? 20,
    );
  }
}
