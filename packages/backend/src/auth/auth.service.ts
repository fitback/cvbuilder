import { Injectable, HttpException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode } from "@cvbuilder/shared";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async verifyTurnstile(token: string): Promise<boolean> {
    if (process.env.TURNSTILE_SECRET_KEY?.startsWith("1x00000000")) return true;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${encodeURIComponent(process.env.TURNSTILE_SECRET_KEY || "")}&response=${encodeURIComponent(token)}`,
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      const data = (await resp.json()) as { success?: boolean };
      return data.success === true;
    } catch {
      this.logger.warn("Turnstile verification request failed");
      return false;
    }
  }

  async register(phone: string, password: string, turnstileToken: string) {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "手机号格式不正确" }, 400);
    }
    if (password.length < 6) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "密码最少6位" }, 400);
    }

    if (!(await this.verifyTurnstile(turnstileToken))) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "安全验证失败，请重试" }, 400);
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "该手机号已注册" }, 409);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { phone, passwordHash: bcrypt.hashSync(password, 10), points: 50 },
      });
      await tx.pointTransaction.create({
        data: { userId: u.id, type: "credit", amount: 50, balance: 50, description: "新用户赠送" },
      });
      return u;
    });
    this.logger.log(`User registered: ${user.id} phone=${maskPhone(phone)}`);
    const token = this.jwt.sign({ sub: user.id });
    return { userId: user.id, token };
  }

  async login(phone: string, password: string, turnstileToken: string) {
    if (!(await this.verifyTurnstile(turnstileToken))) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "安全验证失败，请重试" }, 400);
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      this.logger.warn(`Login failed: phone=${maskPhone(phone)}`);
      throw new HttpException({ code: ErrorCode.UNAUTHORIZED, message: "手机号或密码错误" }, 401);
    }
    this.logger.log(`User logged in: ${user.id}`);
    const token = this.jwt.sign({ sub: user.id });
    return { userId: user.id, token };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "用户不存在" }, 404);
    return {
      id: user.id,
      phone: maskPhone(user.phone),
      points: user.points,
      role: user.role,
    };
  }

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        role: true,
        points: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
