import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRoomDto {
  @Transform(trim)
  @IsString()
  @Length(3, 40)
  name: string;

  @Transform(({ value }) => {
    const trimmed = trim({ value });
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
