import { Exclude, Expose, Type } from 'class-transformer';
import { Role } from '@prisma/client';
import { CustomerProfileResponseDto } from '../../customer_profile/dto/customer_profile.response.dto';

@Exclude()
export class Account_profileResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Exclude() // Ẩn password đi là chuẩn bài rồi nè!
  password: string;

  @Expose()
  role: Role;

  @Expose()
  isActive: boolean;

  @Expose()
  avatar: string | null;

  @Expose()
  @Type(() => CustomerProfileResponseDto)
  profile: CustomerProfileResponseDto | null;

  constructor(partial: Partial<Account_profileResponseDto>) {
    Object.assign(this, partial);
  }
}
