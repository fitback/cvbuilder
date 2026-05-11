import { Injectable, HttpException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ErrorCode } from "@cvbuilder/shared";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(phone: string, password: string) {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "手机号格式不正确" }, 400);
    }
    if (password.length < 6) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "密码最少6位" }, 400);
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "该手机号已注册" }, 409);
    }

    const user = await this.prisma.user.create({
      data: { phone, passwordHash: bcrypt.hashSync(password, 10), points: 30 },
    });
    await this.prisma.pointTransaction.create({
      data: { userId: user.id, type: "credit", amount: 30, balance: 30, description: "新用户赠送" },
    });
    this.logger.log(`User registered: ${user.id} phone=${phone}`);
    const token = this.jwt.sign({ sub: user.id });
    return { userId: user.id, token };
  }

  async login(phone: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      this.logger.warn(`Login failed: phone=${phone}`);
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
      phone: user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2"),
      points: user.points,
      role: user.role,
    };
  }
}
