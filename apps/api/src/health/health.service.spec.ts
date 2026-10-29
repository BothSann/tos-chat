import { Test } from '@nestjs/testing';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  const prisma = {} as PrismaService;
  const health = { check: vi.fn() };
  const prismaHealth = { pingCheck: vi.fn() };
  let service: HealthService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: HealthCheckService, useValue: health },
        { provide: PrismaHealthIndicator, useValue: prismaHealth },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(HealthService);
  });

  it('pings the app Prisma client under the "database" key', async () => {
    const up = { database: { status: 'up' } };
    prismaHealth.pingCheck.mockResolvedValue(up);
    health.check.mockImplementation(
      async (checks: Array<() => Promise<unknown>>) => {
        return { status: 'ok', info: await checks[0]() };
      },
    );

    await expect(service.check()).resolves.toEqual({ status: 'ok', info: up });
    expect(prismaHealth.pingCheck).toHaveBeenCalledWith('database', prisma);
  });
});
