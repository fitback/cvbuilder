import { Controller, Post, Get, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { RegisterDto, LoginDto } from "./auth.dto";

@Controller("auth")
@UseInterceptors(ApiResponseInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.phone, body.password, body.turnstileToken);
  }

  @Post("login")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.phone, body.password, body.turnstileToken);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.userId);
  }
}
