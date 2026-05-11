import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ["log", "error", "warn"] });
  app.use(cookieParser());

  // Request logging
  app.use((req: any, _res: any, next: any) => {
    const start = Date.now();
    _res.on("finish", () => {
      const ms = Date.now() - start;
      Logger.log(`${req.method} ${req.originalUrl} ${_res.statusCode} ${ms}ms`, "Request");
    });
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: ["http://localhost:3000", /^https:\/\/.*\.ngrok-free\.(app|dev)$/],
    credentials: true,
  });
  await app.listen(3001);
  Logger.log("Backend listening on http://localhost:3001", "Bootstrap");
}
bootstrap();