import { Module } from "@nestjs/common";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { AlipayService } from "./alipay.service";

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, AlipayService],
  exports: [AlipayService],
})
export class PaymentModule {}
