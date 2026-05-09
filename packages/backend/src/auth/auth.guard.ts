import { Injectable, CanActivate, ExecutionContext, HttpException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new HttpException({ code: ErrorCode.UNAUTHORIZED, message: "请先登录" }, 401);
    }
    try {
      const payload = this.jwt.verify(header.slice(7));
      (req as any).userId = payload.sub;
      return true;
    } catch {
      throw new HttpException({ code: ErrorCode.UNAUTHORIZED, message: "登录已过期，请重新登录" }, 401);
    }
  }
}
