import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Invalid environment variables: \n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

export function envFilePaths(): string[] {
  return process.env['NODE_ENV'] === 'test' ? ['.env.test', '.env'] : ['.env'];
}
