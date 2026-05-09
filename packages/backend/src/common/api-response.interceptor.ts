import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from "@nestjs/common";
import { Observable, map, catchError, throwError } from "rxjs";

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({ success: true, data })),
      catchError((err) => {
        if (err instanceof HttpException) {
          const response = err.getResponse();
          const body = typeof response === "string" ? { code: "INTERNAL_ERROR", message: response } : response;
          return throwError(() => new HttpException({ success: false, error: body }, err.getStatus()));
        }
        return throwError(() => err);
      }),
    );
  }
}