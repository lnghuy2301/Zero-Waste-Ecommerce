import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { jwtSecret } from './jwt.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(config),
    });
  }

  async validate(payload: any) {
    const id = Number(payload.sub || payload.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new UnauthorizedException();
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account?.isActive)
      throw new UnauthorizedException('Tài khoản không khả dụng');
    return {
      id: account.id,
      email: account.email,
      role: account.role,
    };
  }
}
