import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID') || 'disabled',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET') || 'disabled',
      callbackURL:
        config.get('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    if (!emails?.[0]?.value || profile._json?.email_verified !== true) {
      return done(
        new UnauthorizedException('Google email chưa được xác minh'),
        undefined,
      );
    }
    // Bóc tách dữ liệu Google trả về
    const user = {
      email: emails[0].value,
      fullName: `${name?.givenName || ''} ${name?.familyName || ''}`.trim(),
      picture: photos?.[0]?.value,
    };
    done(null, user);
  }
}
