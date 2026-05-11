import { Module } from "@nestjs/common";
import { GenerateController } from "./generate.controller";
import { GenerateService } from "./generate.service";
import { PointsModule } from "../points/points.module";

@Module({
  imports: [PointsModule],
  controllers: [GenerateController],
  providers: [GenerateService],
})
export class GenerateModule {}
