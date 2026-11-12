import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { AuthLoginDto } from './dto/auth.login.dto';
import { AccountResponseDto } from '../account/dto/account.response.dto';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../account/account.service';
import { AccountRequestDto } from '../account/dto/account.request.dto';
import { plainToInstance } from 'class-transformer';
import { AccountHelper } from '../account/account.helper';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private accountHelper: AccountHelper,
    private jwtService: JwtService,
    private accountService: AccountService,
  ) {}

  async validate(authLoginDto: AuthLoginDto): Promise<AccountResponseDto> {
    const user = await this.prismaService.account.findUnique({
      where: { email: authLoginDto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }
    const pass = await bcrypt.compare(authLoginDto.password, user.password);
    if (!pass) {
      throw new BadRequestException('Mật khẩu không chính xác');
    }

    await this.accountHelper.checkActive(user.id);

    const { password, ...result } = user;
    return plainToInstance(AccountResponseDto, result); // dùng plainToInstance để loại password đúng type
  }

  async register(account: AccountRequestDto): Promise<AccountResponseDto> {
    return await this.accountService.createAccount(account);
  }

  async login(user: any) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isActive: user.isActive,
    };
    return {
      token: this.jwtService.sign(payload),
      id: payload.id, // sửa thành payload.id
      email: payload.email,
      role: payload.role,
      avatar: user.avatar,
      isActive: payload.isActive,
    };
  }

  async validateGoogleUser(googleUser: any) {
    const { email, fullName } = googleUser;

    let account = await this.prismaService.account.findUnique({
      where: { email },
      include: { profile: true }, // Lấy kèm profile
    });

    if (!account) {
      const randomPassword = randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      account = await this.prismaService.account.create({
        data: {
          email,
          password: hashedPassword,
          profile: {
            create: {
              fullName: fullName || 'Google User',
            },
          },
        },
        include: { profile: true },
      });
    }

    if (!account.isActive)
      throw new UnauthorizedException('Tài khoản không khả dụng');
    const payload = {
      sub: account.id,
      email: account.email,
      role: account.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: account.id,
        email: account.email,
        fullName: account.profile?.fullName,
        avatar: account.avatar,
        role: account.role,
      },
      token,
    };
  }
}
