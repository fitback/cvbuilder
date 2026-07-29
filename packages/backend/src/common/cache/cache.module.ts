import { Module, Global } from "@nestjs/common";
import Redis from "ioredis";
import { CacheService, REDIS_CLIENT } from "./cache.service";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis(process.env.REDIS_URL || "redis://localhost:6379"),
    },
    CacheService,
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class CacheModule {}
