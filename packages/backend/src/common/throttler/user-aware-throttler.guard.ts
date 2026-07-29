import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    // AuthGuard sets userId directly on the request object, not on req.user
    const userId = req.userId;
    if (userId) return `user:${userId}`;
    return `ip:${req.ip}`;
  }
}
