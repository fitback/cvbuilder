import { Controller, Post, Get, Body, Req, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import { RegisterDto, LoginDto } from "./auth.dto";

@Controller("auth")
@UseInterceptors(ApiResponseInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.phone, body.password);
  }

  @Post("login")
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.phone, body.password);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    return this.authService.getMe(req.userId);
  }
}
