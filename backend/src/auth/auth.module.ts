import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthLocalStrantegy } from './auth.local.strantegy';
import { JwtStrategy } from './auth.jwt.strantegy';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strantegy';
import { ConfigService } from '@nestjs/config';
import { jwtSecret } from './jwt.config';
import { GoogleAuthGuard } from './google.guard';
// import { AccountService } from '../account/account.service';

@Module({
  imports: [
    AccountModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: jwtSecret(config),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthLocalStrantegy,
    JwtStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
  ],
  exports: [AuthService, AuthLocalStrantegy, JwtStrategy, GoogleStrategy],
})
export class AuthModule {}
