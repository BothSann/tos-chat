import { applyDecorators } from '@nestjs/common';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString } from 'class-validator';

export interface TrimOptions {
  blankAs?: null | undefined;
}

export function Trim(options: TrimOptions = {}): PropertyDecorator {
  const replaceBlank = 'blankAs' in options;

  return applyDecorators(
    Transform(({ value }: TransformFnParams): unknown => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return replaceBlank && trimmed === '' ? options.blankAs : trimmed;
    }),
    IsString(),
  );
}
