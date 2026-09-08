import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response, Request } from "express";
import { ErrorCode } from "@cvbuilder/shared";

/**
 * Global catch-all exception filter that complements ValidationExceptionFilter.
 *
 * - HttpException with `ErrorCode`: logged at "warn" (business-level), response kept
 * - HttpException without `ErrorCode`: logged at "error" (unexpected), generic message returned
 * - Non-HttpException (Error, TypeError, etc.): logged at "error" with stack, 500 returned
 *
 * Every error line includes `requestId` (from pino-http) so it can be cross-referenced
 * with request logs. This is the baseline for error aggregation; can later be shipped
 * to Sentry by adding a Sentry.captureException() call in the catch block.
 *
 * Uses the standard NestJS Logger which is bridged to Pino via app.useLogger().
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();

    const requestId = req?.id;
    const method = req?.method;
    const url = req?.url;
    const userId = (req as any)?.user?.userId;
    const context = { requestId, method, url, userId };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const r = exception.getResponse() as Record<string, any> | string;
      const errorCode = typeof r === "object" && r ? r.code : undefined;
      const message =
        typeof r === "string" ? r
        : typeof r?.message === "string" ? r.message
        : Array.isArray(r?.message) ? (r.message as string[]).join("; ")
        : exception.message;

      const logPayload = { ...context, status, errorCode, message };
      const logLevel = status < 500 ? "warn" : "error";
      const logMsg = `HTTP ${status} ${errorCode ?? "HttpException"}`;
      if (logLevel === "warn") {
        this.logger.warn(JSON.stringify(logPayload) + " " + logMsg);
      } else {
        this.logger.error(JSON.stringify(logPayload) + " " + logMsg);
      }

      return res.status(status).json({
        success: false,
        error: {
          code: errorCode ?? ErrorCode.INTERNAL_ERROR,
          message: message || "请求处理失败",
        },
      });
    }

    const err = exception as Error;
    this.logger.error(
      JSON.stringify({ ...context, errName: err?.name, message: err?.message }) + " Unhandled exception\n" + (err?.stack ?? ""),
    );

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: "服务器内部错误",
      },
    });
  }
}
