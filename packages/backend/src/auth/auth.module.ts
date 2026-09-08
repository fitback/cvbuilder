import { Module, Global, Logger } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { AdminGuard } from "./admin.guard";

const WEAK_JWT_SECRETS = ["cvbuilder-dev-jwt-secret", "secret", "changeme"];

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  const isProd = process.env.NODE_ENV === "production";
  if (WEAK_JWT_SECRETS.includes(secret)) {
    if (isProd) {
      throw new Error(`JWT_SECRET must not be the weak default '${secret}' in production. Set a strong 32+ byte secret.`);
    }
    new Logger("AuthModule").warn(`JWT_SECRET is the weak default '${secret}'. This is only acceptable in development.`);
  }
  return secret;
}

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AdminGuard],
  exports: [AuthGuard, AdminGuard, JwtModule],
})
export class AuthModule {}
