import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiError, ApiErrorCode } from '@tos-chat/shared';
import { Prisma } from '../generated/prisma/client.js';
import { HttpAdapterHost } from '@nestjs/core';

const CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_FAILED',
  429: 'TOO_MANY_REQUESTS',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();

    if (isHealthReport(exception)) {
      httpAdapter.reply(
        response,
        exception.getResponse(),
        exception.getStatus(),
      );
      return;
    }

    const body = toApiError(exception);
    if (body.statusCode >= 500) {
      this.logger.error(
        'Unhandled error',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    httpAdapter.reply(response, body, body.statusCode);
  }
}

function codeFor(status: number): ApiErrorCode {
  return CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL' : 'BAD_REQUEST');
}

function fromHttpException(exception: HttpException): ApiError {
  const statusCode = exception.getStatus();
  const error: ApiError = {
    statusCode,
    code: codeFor(statusCode),
    message: exception.message,
  };
  const response = exception.getResponse();
  if (typeof response === 'object' && response !== null) {
    const { message, fields } = response as {
      message?: unknown;
      fields?: Record<string, string[]>;
    };
    if (typeof message === 'string') error.message = message;
    if (Array.isArray(message)) error.message = message.join('; ');
    if (fields) error.fields = fields;
  }

  return error;
}

function conflictMessage(meta: Record<string, unknown> | undefined): string {
  const model = meta?.['modelName'];
  const index = (
    meta?.['driverAdapterError'] as
      { cause?: { constraint?: { index?: unknown } } } | undefined
  )?.cause?.constraint?.index;
  const prefix = `${String(model)}_`;
  if (
    typeof model === 'string' &&
    typeof index === 'string' &&
    index.startsWith(prefix) &&
    index.endsWith('_key')
  ) {
    const field = index.slice(prefix.length, -'_key'.length);
    return `${model} ${field} is already taken`;
  }
  return 'Already exists';
}

function toApiError(exception: unknown): ApiError {
  if (exception instanceof HttpException) {
    return fromHttpException(exception);
  }
  if (
    exception instanceof Prisma.PrismaClientKnownRequestError &&
    exception.code === 'P2002'
  ) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: 'CONFLICT',
      message: conflictMessage(exception.meta),
    };
  }
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL',
    message: 'Internal server error',
  };
}

function isHealthReport(exception: unknown): exception is HttpException {
  if (!(exception instanceof HttpException)) return false;
  const response = exception.getResponse();
  return (
    exception.getStatus() === HttpStatus.SERVICE_UNAVAILABLE &&
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    response.status === 'error' &&
    'details' in response
  );
}
