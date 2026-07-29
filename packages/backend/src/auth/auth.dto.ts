import { IsString, Length, Matches } from "class-validator";

export class RegisterDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone!: string;

  @IsString()
  @Length(6, 64, { message: "密码最少6位" })
  password!: string;

  @IsString()
  @Length(1, 2048)
  turnstileToken!: string;
}

export class LoginDto {
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  phone!: string;

  @IsString()
  @Length(1, 64)
  password!: string;

  @IsString()
  @Length(1, 2048)
  turnstileToken!: string;
}
