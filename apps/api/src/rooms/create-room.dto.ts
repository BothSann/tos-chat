import { IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { Trim } from '../common/trim.decorator.js';

export class CreateRoomDto {
  @Trim()
  @IsString()
  @Length(3, 40)
  name: string;

  @Trim({ blankAs: undefined })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
