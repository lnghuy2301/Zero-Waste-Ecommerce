import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes, timingSafeEqual } from 'crypto';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (
      !this.config.get('GOOGLE_CLIENT_ID') ||
      !this.config.get('GOOGLE_CLIENT_SECRET')
    ) {
      throw new ServiceUnavailableException(
        'Đăng nhập Google chưa được cấu hình. Hãy dùng tài khoản demo.',
      );
    }
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const options = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.get('NODE_ENV') === 'production',
      path: '/api/v1/auth/google',
    };
    if (req.path.endsWith('/callback')) {
      const cookie = String(req.headers.cookie || '')
        .split(';')
        .map((s) => s.trim())
        .find((s) => s.startsWith('oauth_state='))
        ?.slice(12);
      const state = req.query.state;
      res.clearCookie('oauth_state', options);
      if (
        typeof state !== 'string' ||
        !cookie ||
        !/^[a-f0-9]{64}$/.test(state) ||
        cookie.length !== state.length ||
        !timingSafeEqual(Buffer.from(cookie), Buffer.from(state))
      )
        throw new UnauthorizedException('OAuth state không hợp lệ');
    } else {
      req.oauthState = randomBytes(32).toString('hex');
      res.cookie('oauth_state', req.oauthState, { ...options, maxAge: 600000 });
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    return { state: context.switchToHttp().getRequest().oauthState };
  }
}
