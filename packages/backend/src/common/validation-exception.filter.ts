import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from "@nestjs/common";
import { Response } from "express";
import { ErrorCode } from "@cvbuilder/shared";

/**
 * Catches ValidationPipe errors and formats them to match the API convention:
 * { success: false, error: { code: "INVALID_PARAMS", message: "..." } }
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const err = exception.getResponse() as Record<string, unknown>;

    // Only reformat validation errors (array of constraints); pass through others
    if (Array.isArray(err.message)) {
      return res.status(400).json({
        success: false,
        error: {
          code: ErrorCode.INVALID_PARAMS,
          message: err.message.join("; "),
        },
      });
    }

    // Pass through non-validation BadRequestExceptions unchanged
    return res.status(exception.getStatus()).json({
      success: false,
      error: {
        code: ErrorCode.INVALID_PARAMS,
        message: typeof err.message === "string" ? err.message : "请求参数无效",
      },
    });
  }
}
