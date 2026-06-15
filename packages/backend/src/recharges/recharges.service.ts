import { Injectable, HttpException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PointsService } from "../points/points.service";
import { AlipayService } from "../payment/alipay.service";
import { ErrorCode } from "@cvbuilder/shared";
import { v4 as uuid } from "uuid";

@Injectable()
export class RechargesService {
  private readonly logger = new Logger(RechargesService.name);

  constructor(
    private prisma: PrismaService,
    private points: PointsService,
    private alipay: AlipayService,
  ) {}

  async createOrder(userId: string, amount: number) {
    if (!this.alipay.isValidPlan(amount)) {
      throw new HttpException(
        { code: ErrorCode.INVALID_PARAMS, message: "请选择有效的充值金额" },
        400,
      );
    }

    const outTradeNo = `RC${Date.now()}${uuid().slice(0, 8)}`;
    const points = AlipayService.getPoints(amount);

    // Create a pending recharge record
    await this.prisma.rechargeRecord.create({
      data: {
        userId,
        amount,
        points,
        outTradeNo,
        status: "pending",
      },
    });

    const { paymentUrl } = await this.alipay.createOrder(amount, outTradeNo);

    // Save payment URL for display
    await this.prisma.rechargeRecord.updateMany({
      where: { outTradeNo },
      data: { codeUrl: paymentUrl },
    });

    return { outTradeNo, codeUrl: paymentUrl, amount, points };
  }

  async handleNotify(postData: Record<string, string>) {
    try {
      const result = this.alipay.parseNotify(postData);
      if (!result || !result.success) {
        return { code: "FAIL", message: "通知处理失败" };
      }

      const record = await this.prisma.rechargeRecord.findFirst({
        where: { outTradeNo: result.outTradeNo },
      });

      if (!record) {
        this.logger.warn(`Notify for unknown order: ${result.outTradeNo}`);
        return { code: "FAIL", message: "订单不存在" };
      }

      if (record.status === "approved") {
        return { code: "SUCCESS", message: "已处理" };
      }

      await this.prisma.rechargeRecord.update({
        where: { id: record.id },
        data: {
          status: "approved",
          transactionId: result.tradeNo,
          approvedAt: new Date(),
        },
      });

      await this.points.credit(
        record.userId,
        record.points,
        `支付宝充值 ${record.amount} 元`,
        record.id,
      );

      this.logger.log(`Recharge paid: ${record.id} userId=${record.userId} amount=${record.amount}`);
      return { code: "SUCCESS", message: "OK" };
    } catch (err: any) {
      this.logger.error(`Notify error: ${err.message}`);
      return { code: "FAIL", message: err.message };
    }
  }

  async listMine(userId: string) {
    const records = await this.prisma.rechargeRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, amount: true, points: true, outTradeNo: true,
        status: true, createdAt: true, approvedAt: true,
      },
    });
    return records.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? undefined,
    }));
  }

  async listAll() {
    const records = await this.prisma.rechargeRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { phone: true } } },
    });
    return records.map((r) => ({
      id: r.id,
      userPhone: r.user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
      amount: r.amount,
      points: r.points,
      outTradeNo: r.outTradeNo,
      transactionId: r.transactionId,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      approvedAt: r.approvedAt?.toISOString() ?? undefined,
    }));
  }

  async getStatus(outTradeNo: string, userId: string) {
    const record = await this.prisma.rechargeRecord.findFirst({
      where: { outTradeNo, userId },
    });
    if (!record) {
      throw new HttpException(
        { code: ErrorCode.RESOURCE_NOT_FOUND, message: "订单不存在" },
        404,
      );
    }
    return {
      outTradeNo: record.outTradeNo,
      status: record.status,
      amount: record.amount,
      points: record.points,
    };
  }
}
