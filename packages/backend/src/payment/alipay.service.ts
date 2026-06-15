import { Injectable, Logger } from "@nestjs/common";
import { AlipaySdk } from "alipay-sdk";
import * as crypto from "crypto";

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
  private privateKey: string;

  constructor() {
    this.appId = process.env.ALIPAY_APP_ID || "";
    this.notifyUrl = process.env.ALIPAY_NOTIFY_URL || "";
    this.returnUrl = process.env.ALIPAY_RETURN_URL || "";
    this.privateKey = (process.env.ALIPAY_PRIVATE_KEY || "").replace(/\\n/g, "\n");
    const alipayPublicKey = (process.env.ALIPAY_PUBLIC_KEY || "").replace(/\\n/g, "\n");

    if (this.appId && this.privateKey && alipayPublicKey) {
      try {
        this.sdk = new AlipaySdk({
          appId: this.appId,
          privateKey: this.privateKey,
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

    const timestamp = new Date()
      .toISOString()
      .replace(/\.\d{3}Z$/, "")
      .replace("T", " ");

    const bizContent = JSON.stringify({
      out_trade_no: outTradeNo,
      total_amount: amount.toFixed(2),
      subject: `ResumeMatcher 充值 ${amount} 元`,
      product_code: "FAST_INSTANT_TRADE_PAY",
    });

    // 手动构建参数（按字母序排列用于签名）
    const params: Record<string, string> = {
      app_id: this.appId,
      biz_content: bizContent,
      charset: "utf-8",
      method: "alipay.trade.page.pay",
      sign_type: "RSA2",
      timestamp,
      version: "1.0",
    };
    if (this.returnUrl) params.return_url = this.returnUrl;
    if (this.notifyUrl) params.notify_url = this.notifyUrl;

    // 构建签名字符串：按 key 字母排序，用 & 连接
    const sortedKeys = Object.keys(params).sort();
    const signStr = sortedKeys.map((k) => `${k}=${params[k]}`).join("&");

    // RSA-SHA256 签名
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signStr, "utf-8");
    const signature = sign.sign(this.privateKey, "base64");

    // 构建支付 URL
    params["sign"] = signature;
    const queryParts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      queryParts.push(`${k}=${encodeURIComponent(v)}`);
    }
    const paymentPage = `https://openapi.alipay.com/gateway.do?${queryParts.join("&")}`;

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
