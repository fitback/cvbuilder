import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

if (!process.env.TURNSTILE_SECRET_KEY) {
  console.warn("⚠️ TURNSTILE_SECRET_KEY is not set — login/register will fail with '安全验证失败，请重试'");
}

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { ValidationPipe } from "@nestjs/common";
import { ValidationExceptionFilter } from "./common/validation-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.useGlobalFilters(new ValidationExceptionFilter());
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = process.env.CORS_ORIGIN;
      // Allow same-origin, localhost, ngrok tunnels, or explicit CORS_ORIGIN
      if (!origin) return callback(null, true);
      if (origin.startsWith("http://localhost") || origin.startsWith("https://localhost")) return callback(null, true);
      if (origin.endsWith(".ngrok-free.dev") || origin.endsWith(".ngrok.io")) return callback(null, true);
      if (allowed && allowed !== "*") {
        const allowedList = allowed.split(",").map((o) => o.trim());
        if (allowedList.includes(origin)) return callback(null, true);
      }
      if (allowed === "*") return callback(null, true);
      // Allow server IP access
      if (origin.startsWith("http://8.160.123.149") || origin.startsWith("https://8.160.123.149")) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });
  await app.listen(3001);
}
bootstrap();