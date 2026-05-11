import { IsString, Length, Matches } from "class-validator";

export class RegisterDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone!: string;

  @IsString()
  @Length(6, 64, { message: "密码最少6位" })
  password!: string;
}

export class LoginDto {
  @IsString()
  phone!: string;

  @IsString()
  password!: string;
}
