import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { CustomerProfileRequestDto } from '../../customer_profile/dto/customer_profile.request.dto';

export class AccountRequestDto {
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsNotEmpty({ message: 'Password không được để trống' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(72)
  password: string;

  @IsNotEmpty({ message: 'Role không được để trống' })
  @IsEnum(Role, {
    message: 'Quyền không hợp lệ (Chỉ nhận ADMIN hoặc CUSTOMER)',
  })
  role: Role;

  @IsNotEmpty({ message: 'Trạng thái không được bỏ trống' })
  @IsBoolean({ message: 'Trạng thái phải true/false' })
  isActive: boolean;

  @IsOptional()
  @IsString()
  avatar?: string | null;

  @ValidateNested()
  @Type(() => CustomerProfileRequestDto)
  @IsNotEmpty()
  profile: CustomerProfileRequestDto;
}
