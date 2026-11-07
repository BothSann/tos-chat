import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { IsMessageCursor } from './is-message-cursor.decorator.js';
import { Type } from 'class-transformer';

export class ListMessagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(50)
  @Min(1)
  limit: number = 30;

  @IsOptional()
  @IsMessageCursor()
  cursor?: string;
}
