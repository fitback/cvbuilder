import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { v4 as uuid } from "uuid";
import { Request, Response } from "express";

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    let sessionId = req.cookies?.["session_id"];
    if (!sessionId) {
      sessionId = uuid();
      res.cookie("session_id", sessionId, {
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      });
    }
    (req as any).sessionId = sessionId;
    return true;
  }
}