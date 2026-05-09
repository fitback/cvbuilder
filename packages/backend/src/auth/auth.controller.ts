import { Controller, Post, Get, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";

@Controller("auth")
@UseInterceptors(ApiResponseInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: { phone: string; password: string }) {
    return this.authService.register(body.phone, body.password);
  }

  @Post("login")
  async login(@Body() body: { phone: string; password: string }) {
    return this.authService.login(body.phone, body.password);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.userId);
  }
}
