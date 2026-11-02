import { NotFoundException, PipeTransform } from '@nestjs/common';

const CUID = /^c[a-z0-9]{24}$/;

export class ParseCuidPipe implements PipeTransform<string, string> {
  constructor(private readonly recordName = 'Record') {}

  transform(value: string): string {
    if (!CUID.test(value)) {
      throw new NotFoundException(`${this.recordName} not found`);
    }

    return value;
  }
}
