import { NotFoundException } from '@nestjs/common';
import { ParseCuidPipe } from './parse-cuid.pipe.js';

describe('ParseCuidPipe', () => {
  const pipe = new ParseCuidPipe('Room');

  it('returns a cuid unchanged', () => {
    expect(pipe.transform('cmhfx2k0e0000qz8v1n2b3c4d')).toBe(
      'cmhfx2k0e0000qz8v1n2b3c4d',
    );
  });

  it.each([
    ['too short', 'abc'],
    ['too long', 'cmhfx2k0e0000qz8v1n2b3c4dx'],
    ['not starting with c', 'xmhfx2k0e0000qz8v1n2b3c4d'],
    ['uppercase', 'CMHFX2K0E0000QZ8V1N2B3C4D'],
    ['a uuid', '3f2b8c1e-9d4a-4e7b-8c2f-1a2b3c4d5e6f'],
    ['empty', ''],
  ])('throws 404 for an id that is %s', (_, id) => {
    expect(() => pipe.transform(id)).toThrow(
      new NotFoundException('Room not found'),
    );
  });

  it('names a generic record when no name is given', () => {
    expect(() => new ParseCuidPipe().transform('abc')).toThrow(
      'Record not found',
    );
  });
});
