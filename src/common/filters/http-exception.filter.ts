import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP Exception Filter
 * 
 * Catches all HTTP exceptions and formats the response consistently.
 * Logs errors for debugging while returning user-friendly messages.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message,
      ...(typeof exceptionResponse === 'object' &&
      !(exceptionResponse instanceof String)
        ? { details: exceptionResponse }
        : {}),
    };

    // Log error details
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception.stack,
        HttpExceptionFilter.name,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${errorResponse.message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}

