import {
  ArgumentsHost,
  ConflictException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client.js';
import { ApiExceptionFilter } from './api-exception.filter.js';
import { validationExceptionFactory } from './validation-exception.factory.js';

describe('ApiExceptionFilter', () => {
  const reply = vi.fn();
  const response = {};
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  const filter = new ApiExceptionFilter({
    httpAdapter: { reply },
  } as unknown as HttpAdapterHost);

  /** Runs the filter and returns the body and status it replied with. */
  function handle(exception: unknown) {
    filter.catch(exception, host);
    const [res, body, status] = reply.mock.lastCall ?? [];
    expect(res).toBe(response);
    return { body, status };
  }

  /** Silences the 500 log line and returns the spy. */
  function muteErrorLog() {
    return vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  }

  /** The error Prisma 7's pg adapter throws for a duplicate room name. */
  function uniqueViolation(index: string) {
    return new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: '7.10.1',
      meta: {
        modelName: 'Room',
        driverAdapterError: {
          name: 'DriverAdapterError',
          cause: {
            originalCode: '23505',
            kind: 'UniqueConstraintViolation',
            constraint: { index },
          },
        },
      },
    });
  }

  beforeEach(() => {
    reply.mockReset();
    vi.restoreAllMocks();
  });

  it('adds a code to Nest HTTP exceptions', () => {
    expect(handle(new NotFoundException('Cannot GET /nope'))).toEqual({
      status: 404,
      body: { statusCode: 404, code: 'NOT_FOUND', message: 'Cannot GET /nope' },
    });
    expect(handle(new UnauthorizedException()).body).toEqual({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  });

  it('keeps fields from the validation factory on a 422', () => {
    const exception = validationExceptionFactory([
      {
        property: 'name',
        constraints: {
          isLength: 'name must be longer than or equal to 3 characters',
        },
        children: [],
      },
    ]);

    expect(handle(exception)).toEqual({
      status: 422,
      body: {
        statusCode: 422,
        code: 'VALIDATION_FAILED',
        message: 'Validation failed',
        fields: { name: ['name must be longer than or equal to 3 characters'] },
      },
    });
  });

  it('turns a Prisma unique violation into 409 CONFLICT', () => {
    expect(handle(uniqueViolation('Room_name_key'))).toEqual({
      status: 409,
      body: {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Room name is already taken',
      },
    });
  });

  it('falls back to a generic conflict message for an unexpected index name', () => {
    expect(handle(uniqueViolation('custom_idx')).body).toEqual({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Already exists',
    });
  });

  it('keeps the message of a ConflictException a service throws', () => {
    expect(handle(new ConflictException('Room name is taken')).body).toEqual({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'Room name is taken',
    });
  });

  it('passes the Terminus health report through unchanged', () => {
    const report = {
      status: 'error',
      info: {},
      error: { database: { status: 'down' } },
      details: { database: { status: 'down' } },
    };

    expect(handle(new ServiceUnavailableException(report))).toEqual({
      status: 503,
      body: report,
    });
  });

  it('hides the details of anything unexpected behind a logged 500', () => {
    const logged = muteErrorLog();

    const { status, body } = handle(
      new Error('relation "Room" does not exist'),
    );

    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      code: 'INTERNAL',
      message: 'Internal server error',
    });
    expect(logged).toHaveBeenCalledOnce();
  });

  it('maps a missing record (P2025) to 404 with the model name', () => {
    const missing = new Prisma.PrismaClientKnownRequestError('No record', {
      code: 'P2025',
      clientVersion: '7.10.1',
      meta: { modelName: 'Room', operation: 'a delete' },
    });

    expect(handle(missing)).toEqual({
      status: 404,
      body: { statusCode: 404, code: 'NOT_FOUND', message: 'Room not found' },
    });
  });

  it('says "Not found" when P2025 has no model name', () => {
    const missing = new Prisma.PrismaClientKnownRequestError('No record', {
      code: 'P2025',
      clientVersion: '7.10.1',
    });

    expect(handle(missing).body).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Not found',
    });
  });

  it('maps a failed foreign key (P2003) to 404', () => {
    const gone = new Prisma.PrismaClientKnownRequestError('Foreign key', {
      code: 'P2003',
      clientVersion: '7.10.1',
      meta: { modelName: 'Membership' },
    });

    expect(handle(gone)).toEqual({
      status: 404,
      body: { statusCode: 404, code: 'NOT_FOUND', message: 'Not found' },
    });
  });

  it('answers 500 for any other Prisma error', () => {
    const logged = muteErrorLog();
    const other = new Prisma.PrismaClientKnownRequestError('Timed out', {
      code: 'P1008',
      clientVersion: '7.10.1',
    });

    expect(handle(other).status).toBe(500);
    expect(logged).toHaveBeenCalledOnce();
  });
});
