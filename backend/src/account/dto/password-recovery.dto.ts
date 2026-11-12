import {
  IsEmail,
  IsString,
  Length,
  MinLength,
  MaxLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class PasswordRecoveryDto extends ForgotPasswordDto {
  @IsString()
  @Length(64, 64)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
