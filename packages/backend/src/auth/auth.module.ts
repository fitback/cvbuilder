import { Module, Global } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || (() => { throw new Error("JWT_SECRET environment variable is required"); })(),
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard],
  exports: [AuthGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
