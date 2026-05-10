import { Module } from "@nestjs/common";
import { RechargesService } from "./recharges.service";
import { RechargesController } from "./recharges.controller";
import { PointsModule } from "../points/points.module";

@Module({
  imports: [PointsModule],
  providers: [RechargesService],
  controllers: [RechargesController],
})
export class RechargesModule {}
