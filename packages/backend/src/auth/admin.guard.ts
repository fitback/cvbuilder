import { Injectable, CanActivate, ExecutionContext, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const userId = (req as Request & { userId: string }).userId;
    if (!userId) {
      throw new HttpException({ code: ErrorCode.UNAUTHORIZED, message: "请先登录" }, 401);
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== "admin") {
      throw new HttpException({ code: ErrorCode.UNAUTHORIZED, message: "无权操作" }, 401);
    }
    return true;
  }
}
