import { IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  old_password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  new_password: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  confirm_password: string;
}
