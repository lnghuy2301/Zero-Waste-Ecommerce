import { Exclude, Expose } from 'class-transformer';
import { Role } from '@prisma/client';

@Exclude()
export class AccountResponseDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Exclude()
  password: string;

  @Expose()
  role: Role;

  @Expose()
  isActive: boolean;

  @Expose()
  avatar: string | null;
}
