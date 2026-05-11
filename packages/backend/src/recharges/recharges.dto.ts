import { IsInt, IsString, Min, MinLength } from "class-validator";

export class CreateRechargeDto {
  @IsInt({ message: "充值金额必须为正整数" })
  @Min(1, { message: "充值金额必须为正整数" })
  amount!: number;

  @IsString()
  @MinLength(4, { message: "请填写转账单号" })
  orderNo!: string;
}

export class RejectRechargeDto {
  note?: string;
}
