import { Injectable, HttpException, StreamableFile } from "@nestjs/common";
import { ErrorCode } from "@cvbuilder/shared";
import * as fs from "fs";
import * as path from "path";

const QR_DIR = process.env.RESUME_STORAGE_PATH
  ? path.resolve(process.env.RESUME_STORAGE_PATH, "../payment-qr")
  : "./data/payment-qr";
const QR_PATH = path.resolve(QR_DIR, "qr-code.png");

@Injectable()
export class PaymentService {
  async saveQrCode(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "请上传图片文件" }, 400);
    }
    if (!file.mimetype.startsWith("image/")) {
      throw new HttpException({ code: ErrorCode.INVALID_PARAMS, message: "仅支持图片格式" }, 400);
    }
    fs.mkdirSync(QR_DIR, { recursive: true });
    fs.writeFileSync(QR_PATH, file.buffer);
    return "/payment/qr-code-image";
  }

  getQrCode(): { exists: boolean; url?: string } {
    if (fs.existsSync(QR_PATH)) {
      return { exists: true, url: "/payment/qr-code-image" };
    }
    return { exists: false };
  }

  getQrCodeStream(): StreamableFile {
    if (!fs.existsSync(QR_PATH)) {
      throw new HttpException({ code: ErrorCode.RESOURCE_NOT_FOUND, message: "付款码未设置" }, 404);
    }
    const file = fs.createReadStream(QR_PATH);
    return new StreamableFile(file, {
      type: "image/png",
      disposition: "inline",
    });
  }
}
