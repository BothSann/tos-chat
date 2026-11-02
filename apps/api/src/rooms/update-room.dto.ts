import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateRoomDto } from './create-room.dto.js';
import { IsOptional, ValidateIf, MaxLength } from 'class-validator';
import { Trim } from '../common/trim.decorator.js';

export class UpdateRoomDto extends PartialType(
  OmitType(CreateRoomDto, ['description'] as const),
) {
  @ValidateIf((_, value) => value !== undefined)
  name?: string;

  @Trim({ blankAs: null })
  @IsOptional()
  @MaxLength(200)
  description?: string | null;
}
