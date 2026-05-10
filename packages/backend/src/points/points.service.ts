import { Injectable, HttpException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  async deduct(userId: string, amount: number, description: string, referenceId?: string): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, points: { gte: amount } },
      data: { points: { decrement: amount } },
    });
    if (result.count === 0) {
      throw new HttpException(
        { code: ErrorCode.QUOTA_EXCEEDED, message: `积分不足，需要 ${amount} 积分` },
        403,
      );
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await this.prisma.pointTransaction.create({
      data: { userId, type: "debit", amount, balance: user.points, description, referenceId },
    });

    return user.points;
  }

  async credit(userId: string, amount: number, description: string, referenceId?: string): Promise<number> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: amount } },
    });

    await this.prisma.pointTransaction.create({
      data: { userId, type: "credit", amount, balance: user.points, description, referenceId },
    });

    return user.points;
  }

  async refund(userId: string, amount: number, description: string, referenceId?: string): Promise<number> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { points: { increment: amount } },
    });

    await this.prisma.pointTransaction.create({
      data: { userId, type: "refund", amount, balance: user.points, description, referenceId },
    });

    return user.points;
  }

  async getBalance(userId: string): Promise<{ balance: number; recentTransactions: any[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const recentTransactions = await this.prisma.pointTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, amount: true, balance: true, description: true, createdAt: true },
    });
    return {
      balance: user.points,
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  async getTransactions(userId: string, page: number = 1, pageSize: number = 20) {
    const [items, total] = await Promise.all([
      this.prisma.pointTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, type: true, amount: true, balance: true, description: true, createdAt: true },
      }),
      this.prisma.pointTransaction.count({ where: { userId } }),
    ]);
    return {
      items: items.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
      total,
      page,
      pageSize,
    };
  }
}
