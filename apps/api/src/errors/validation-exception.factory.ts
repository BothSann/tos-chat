import { UnprocessableEntityException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export function validationExceptionFactory(
  errors: ValidationError[],
): UnprocessableEntityException {
  const fields: Record<string, string[]> = {};
  collect(errors, '', fields);
  return new UnprocessableEntityException({
    message: 'Validation failed',
    fields,
  });
}

function collect(
  errors: ValidationError[],
  parentPath: string,
  fields: Record<string, string[]>,
): void {
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    if (error.constraints) {
      fields[path] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      collect(error.children, path, fields);
    }
  }
}
