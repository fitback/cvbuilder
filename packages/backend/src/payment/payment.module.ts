import { Module } from "@nestjs/common";
import { AlipayService } from "./alipay.service";

@Module({
  providers: [AlipayService],
  exports: [AlipayService],
})
export class PaymentModule {}
