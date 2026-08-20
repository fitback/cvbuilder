import { Injectable, Logger } from "@nestjs/common";
import { AlipaySdk } from "alipay-sdk";

const PLANS = [10, 20, 50] as const;

export interface CreateOrderResult {
  codeUrl: string;
  outTradeNo: string;
}

export interface NotifyResult {
  outTradeNo: string;
  tradeNo: string;
  amount: number;
  success: boolean;
}

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private sdk: AlipaySdk | null = null;
  private appId: string;
  private notifyUrl: string;

  constructor() {
    this.appId = process.env.ALIPAY_APP_ID || "";
    this.notifyUrl = process.env.ALIPAY_NOTIFY_URL || "";
    const privateKey = (process.env.ALIPAY_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    const alipayPublicKey = (process.env.ALIPAY_PUBLIC_KEY || "").replace(/\\n/g, "\n");

    if (this.appId && privateKey && alipayPublicKey) {
      try {
        this.sdk = new AlipaySdk({
          appId: this.appId,
          privateKey,
          alipayPublicKey,
          signType: "RSA2",
          gateway: "https://openapi.alipay.com/gateway.do",
        });
        this.logger.log("Alipay SDK initialized");
      } catch (err) {
        this.logger.warn("Alipay SDK init failed, payment disabled");
      }
    } else {
      this.logger.warn("Alipay config incomplete, payment disabled");
    }
  }

  isValidPlan(amount: number): boolean {
    return (PLANS as readonly number[]).includes(amount);
  }

  static getPoints(amount: number): number {
    return amount * 10;
  }

  // 当面付：支付宝接口直接返回收款二维码内容（qr_code），前端渲染展示
  async createOrder(amount: number, outTradeNo: string): Promise<CreateOrderResult> {
    if (!this.sdk) throw new Error("支付宝未配置");

    const result = await this.sdk.exec("alipay.trade.precreate", {
      method: "alipay.trade.precreate",
      bizContent: {
        out_trade_no: outTradeNo,
        total_amount: amount.toFixed(2),
        subject: `ResumeMatcher 充值 ${amount} 元`,
        timeout_express: "15m",
      },
      notifyUrl: this.notifyUrl,
    });

    if (result.code === "10000" && result.qr_code) {
      this.logger.log(`Alipay order created: outTradeNo=${outTradeNo} amount=${amount}`);
      return { codeUrl: result.qr_code, outTradeNo };
    }

    this.logger.error(`Alipay order failed: ${JSON.stringify(result)}`);
    throw new Error(result.sub_msg || "创建支付订单失败");
  }

  parseNotify(postData: Record<string, string>): NotifyResult | null {
    if (!this.sdk) return null;

    const ok = this.sdk.checkNotifySign(postData);
    if (!ok) {
      this.logger.warn("Alipay notify sign check failed");
      return null;
    }

    // trade_status: TRADE_SUCCESS / WAIT_BUYER_PAY / TRADE_CLOSED
    if (postData.trade_status !== "TRADE_SUCCESS") {
      return null;
    }

    const amount = parseFloat(postData.total_amount || "0");

    return {
      outTradeNo: postData.out_trade_no || "",
      tradeNo: postData.trade_no || "",
      amount: Math.round(amount),
      success: true,
    };
  }
}
