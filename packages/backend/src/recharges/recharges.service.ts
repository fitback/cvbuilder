import { Injectable, HttpException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PointsService } from "../points/points.service";
import { ErrorCode } from "@cvbuilder/shared";

@Injectable()
export class RechargesService {
  private readonly logger = new Logger(RechargesService.name);

  constructor(
    private prisma: PrismaService,
    private points: PointsService,
  ) {}

  async create(userId: string, amount: number, orderNo: string) {
    if (!Number.isInteger(amount) || amount < 1) {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "充值金额必须为正整数" },
        400,
      );
    }
    if (!orderNo || orderNo.trim().length < 4) {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "请填写转账单号" },
        400,
      );
    }

    const existing = await this.prisma.rechargeRecord.findFirst({
      where: { orderNo: orderNo.trim(), userId },
    });
    if (existing) {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "该单号已提交过" },
        400,
      );
    }

    const record = await this.prisma.rechargeRecord.create({
      data: {
        userId,
        amount,
        points: amount * 10,
        orderNo: orderNo.trim(),
      },
    });

    return { id: record.id, amount, points: record.points, status: record.status };
  }

  async listMine(userId: string) {
    const records = await this.prisma.rechargeRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, amount: true, points: true, orderNo: true,
        status: true, adminNote: true, createdAt: true, approvedAt: true,
      },
    });
    return records.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? undefined,
    }));
  }

  async listPending() {
    const records = await this.prisma.rechargeRecord.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { phone: true } } },
    });
    return records.map((r) => ({
      id: r.id,
      userPhone: r.user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
      amount: r.amount,
      points: r.points,
      orderNo: r.orderNo,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async approve(id: string, adminId: string) {
    const record = await this.prisma.rechargeRecord.findUnique({ where: { id } });
    if (!record) {
      throw new HttpException(
        { code: ErrorCode.RESOURCE_NOT_FOUND, message: "充值记录不存在" },
        404,
      );
    }
    if (record.status !== "pending") {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "该记录已处理" },
        400,
      );
    }

    await this.prisma.rechargeRecord.update({
      where: { id },
      data: { status: "approved", adminId, approvedAt: new Date() },
    });

    await this.points.credit(
      record.userId,
      record.points,
      `充值 ${record.amount} 元`,
      record.id,
    );

    this.logger.log(`Recharge approved: ${id} userId=${record.userId} amount=${record.amount} points=${record.points} adminId=${adminId}`);
    return { success: true };
  }

  async reject(id: string, adminId: string, note?: string) {
    const record = await this.prisma.rechargeRecord.findUnique({ where: { id } });
    if (!record) {
      throw new HttpException(
        { code: ErrorCode.RESOURCE_NOT_FOUND, message: "充值记录不存在" },
        404,
      );
    }
    if (record.status !== "pending") {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "该记录已处理" },
        400,
      );
    }

    await this.prisma.rechargeRecord.update({
      where: { id },
      data: { status: "rejected", adminId, adminNote: note || null },
    });

    return { success: true };
  }
}
