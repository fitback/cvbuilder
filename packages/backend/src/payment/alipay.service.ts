import { Injectable, Logger } from "@nestjs/common";
import { AlipaySdk } from "alipay-sdk";

const PLANS = [10, 20, 50] as const;

export interface CreateOrderResult {
  paymentPage: string;
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
  private returnUrl: string;

  constructor() {
    this.appId = process.env.ALIPAY_APP_ID || "";
    this.notifyUrl = process.env.ALIPAY_NOTIFY_URL || "";
    this.returnUrl = process.env.ALIPAY_RETURN_URL || "";
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
    return PLANS.includes(amount as any);
  }

  static getPoints(amount: number): number {
    return amount * 10;
  }

  async createOrder(amount: number, outTradeNo: string): Promise<CreateOrderResult> {
    if (!this.sdk) throw new Error("支付宝未配置");

    // 电脑网站支付：生成带签名参数的完整 HTML 表单，前端打开后自动跳转
    const paymentPage = this.sdk.pageExec("alipay.trade.page.pay", {
      bizContent: {
        out_trade_no: outTradeNo,
        total_amount: amount.toFixed(2),
        subject: `ResumeMatcher 充值 ${amount} 元`,
        product_code: "FAST_INSTANT_TRADE_PAY",
      },
      returnUrl: this.returnUrl || undefined,
      notifyUrl: this.notifyUrl || undefined,
    });

    this.logger.log(`Alipay page pay generated: outTradeNo=${outTradeNo} amount=${amount}`);
    return { paymentPage, outTradeNo };
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
