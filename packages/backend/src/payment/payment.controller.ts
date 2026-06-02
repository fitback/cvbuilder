import { Controller, Get, Post, Req, UseGuards, UseInterceptors, UploadedFile, Res } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { PaymentService } from "./payment.service";
import { AuthGuard } from "../auth/auth.guard";
import { AdminGuard } from "../auth/admin.guard";
import { ApiResponseInterceptor } from "../common/api-response.interceptor";
import type { Response } from "express";

@Controller("payment")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get("qr-code")
  @UseInterceptors(ApiResponseInterceptor)
  async getQrCodeInfo() {
    return this.paymentService.getQrCode();
  }

  @Get("qr-code-image")
  async getQrCodeImage(@Res({ passthrough: true }) res: Response) {
    res.set({ "Cache-Control": "public, max-age=3600" });
    return this.paymentService.getQrCodeStream();
  }

  @Post("qr-code")
  @UseGuards(AuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  @UseInterceptors(ApiResponseInterceptor)
  async uploadQrCode(@UploadedFile() file: Express.Multer.File) {
    return this.paymentService.saveQrCode(file);
  }
}
