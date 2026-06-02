import { Module } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { RechargesController } from "./recharges.controller";
import { PointsModule } from "../points/points.module";
import { PaymentModule } from "../payment/payment.module";

@Module({
  imports: [PointsModule, PaymentModule],
  providers: [RechargesService],
  controllers: [RechargesController],
})
export class RechargesModule {}
