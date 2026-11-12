import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Sửa CORS để cho phép frontend tải ảnh từ uploads
  app.enableCors({
    origin: (
      process.env.CORS_ORIGINS ||
      process.env.FRONTEND_URL ||
      'http://localhost:5173'
    )
      .split(',')
      .map((s) => s.trim()),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Zero Waste E-commerce API')
    .setDescription('API documentation for Zero Waste Project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Serve uploads (đã đúng)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(
    Number(process.env.PORT || 3000),
    process.env.HOST ||
      (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  );
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger Docs is running on: ${await app.getUrl()}/api/docs`);
}
bootstrap().catch((error) => {
  console.error('Unable to start API:', error.message);
  process.exitCode = 1;
});
