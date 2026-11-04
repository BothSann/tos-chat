import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateRoomDto } from './create-room.dto.js';
import {
  IsOptional,
  ValidateIf,
  MaxLength,
  IsString,
  Length,
} from 'class-validator';
import { Trim } from '../common/trim.decorator.js';

export class UpdateRoomDto extends PartialType(
  OmitType(CreateRoomDto, ['description', 'type', 'password'] as const),
) {
  @ValidateIf((_, value) => value !== undefined)
  name?: string;

  @Trim({ blankAs: null })
  @IsOptional()
  @MaxLength(200)
  description?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Length(8, 128)
  password?: string;
}
