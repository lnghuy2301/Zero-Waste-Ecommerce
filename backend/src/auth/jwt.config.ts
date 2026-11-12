import { ConfigService } from '@nestjs/config';

export function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret || secret.length < 32 || secret.startsWith('change-me')) {
    throw new Error(
      'Set JWT_SECRET to a unique random value of at least 32 characters.',
    );
  }
  return secret;
}
