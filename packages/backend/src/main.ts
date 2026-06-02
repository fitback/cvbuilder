import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      const allowed = process.env.CORS_ORIGIN;
      // Allow same-origin, localhost, ngrok tunnels, or explicit CORS_ORIGIN
      if (!origin) return callback(null, true);
      if (origin.startsWith("http://localhost") || origin.startsWith("https://localhost")) return callback(null, true);
      if (origin.endsWith(".ngrok-free.dev") || origin.endsWith(".ngrok.io")) return callback(null, true);
      if (allowed && (origin === allowed || allowed === "*")) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  });
  await app.listen(3001);
}
bootstrap();