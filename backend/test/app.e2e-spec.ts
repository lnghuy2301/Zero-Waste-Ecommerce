import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('HTTP validation and access control', () => {
  let app: INestApplication;
  const prisma = {
    account: { findUnique: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET =
      'test-only-secret-for-http-tests-at-least-32-characters';
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('returns database health', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', database: 'connected' });
  });
  it('requires authentication for orders', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/order')
      .send({})
      .expect(401);
  });
  it('rejects malformed password recovery input', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/account/reset-password')
      .send({ email: 'invalid', token: null, newPassword: 'x' })
      .expect(400);
  });
  it('does not expose the removed standalone order-detail API', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/order-detail/1')
      .expect(404);
  });
});
