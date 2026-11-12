import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './auth.jwt.strantegy';
import { jwtSecret } from './jwt.config';

describe('JWT authentication', () => {
  const config = new ConfigService({
    JWT_SECRET: 'a-test-only-secret-that-is-longer-than-32-characters',
  });
  it('rejects missing or template secrets', () => {
    expect(() =>
      jwtSecret({ get: () => undefined } as unknown as ConfigService),
    ).toThrow();
    expect(() =>
      jwtSecret(
        new ConfigService({
          JWT_SECRET: 'change-me-generate-a-random-secret-before-running',
        }),
      ),
    ).toThrow();
  });
  it('uses the current database role rather than a stale ADMIN claim', async () => {
    const prisma = {
      account: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 2,
            email: 'demo@example.com',
            role: 'CUSTOMER',
            isActive: true,
          }),
      },
    };
    const strategy = new JwtStrategy(config, prisma as any);
    expect(await strategy.validate({ sub: 2, role: 'ADMIN' })).toMatchObject({
      id: 2,
      role: 'CUSTOMER',
    });
  });
  it('rejects a token for a disabled account', async () => {
    const strategy = new JwtStrategy(config, {
      account: { findUnique: jest.fn().mockResolvedValue({ isActive: false }) },
    } as any);
    await expect(strategy.validate({ id: 2 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
