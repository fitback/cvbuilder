import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Response, Request } from "express";
import { ErrorCode } from "@cvbuilder/shared";

/**
 * Global catch-all exception filter.
 *
 * Handles ALL exceptions (replaces ValidationExceptionFilter).
 *
 * - HttpException with explicit `code` (business errors): code is passed through.
 * - HttpException without `code` (NestJS built-ins like NotFoundException):
 *   HTTP status is mapped to the closest ErrorCode:
 *     400 → INVALID_PARAMS    401/403 → UNAUTHORIZED
 *     404 → RESOURCE_NOT_FOUND  409 → DUPLICATE_NAME
 *     413 → FILE_TOO_LARGE       415 → FILE_TYPE_UNSUPPORTED
 *     429 → INVALID_PARAMS       5xx → INTERNAL_ERROR
 * - Non-HttpException (Error, TypeError, etc.): logged at error with stack, 500 returned.
 *
 * Log levels: 4xx → warn (business-level), 5xx / non-Http → error (unexpected).
 * Every line carries requestId/method/url/userId for cross-referencing.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private static readonly STATUS_TO_CODE: Record<number, ErrorCode> = {
    [HttpStatus.BAD_REQUEST]: ErrorCode.INVALID_PARAMS,
    [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
    [HttpStatus.FORBIDDEN]: ErrorCode.UNAUTHORIZED,
    [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
    [HttpStatus.CONFLICT]: ErrorCode.DUPLICATE_NAME,
    [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.FILE_TOO_LARGE,
    [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: ErrorCode.FILE_TYPE_UNSUPPORTED,
    [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.INVALID_PARAMS,
  };

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

      // Explicit ErrorCode attached by services takes precedence.
      const explicitCode = typeof r === "object" && r ? (r.code as ErrorCode | undefined) : undefined;
      const errorCode = explicitCode ?? AllExceptionsFilter.STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL_ERROR;

      const message =
        typeof r === "string" ? r
        : Array.isArray(r?.message) ? (r.message as string[]).join("; ")
        : typeof r?.message === "string" ? r.message
        : exception.message;

      const logPayload = { ...context, status, errorCode, message };
      const logLevel = status < 500 ? "warn" : "error";
      const logMsg = `HTTP ${status} ${errorCode}`;
      if (logLevel === "warn") {
        this.logger.warn(JSON.stringify(logPayload) + " " + logMsg);
      } else {
        this.logger.error(JSON.stringify(logPayload) + " " + logMsg);
      }

      return res.status(status).json({
        success: false,
        error: { code: errorCode, message: message || "请求处理失败" },
      });
    }

    const err = exception as Error;
    this.logger.error(
      JSON.stringify({ ...context, errName: err?.name, message: err?.message }) + " Unhandled exception\n" + (err?.stack ?? ""),
    );

    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ErrorCode.INTERNAL_ERROR, message: "服务器内部错误" },
    });
  }
}
