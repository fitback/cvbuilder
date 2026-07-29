import { IsIn } from "class-validator";

const ALLOWED_AMOUNTS = [10, 20, 50];

export class RechargeOrderDto {
  @IsIn(ALLOWED_AMOUNTS, { message: "无效的充值金额，可选：10, 20, 50" })
  amount!: number;
}
