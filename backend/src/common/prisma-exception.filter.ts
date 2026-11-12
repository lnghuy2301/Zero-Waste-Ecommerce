import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const errors: Record<string, [number, string]> = {
      P2002: [409, 'Dữ liệu đã tồn tại. Vui lòng kiểm tra lại.'],
      P2003: [
        409,
        'Dữ liệu đang được sử dụng. Hãy ngừng kích hoạt thay vì xóa.',
      ],
      P2025: [404, 'Không tìm thấy dữ liệu.'],
      P2034: [409, 'Dữ liệu vừa thay đổi, vui lòng thử lại.'],
    };
    const [statusCode, message] = errors[exception.code] || [
      500,
      'Không thể xử lý dữ liệu.',
    ];
    if (statusCode >= 500)
      console.error('Database request failed:', exception.code);
    response.status(statusCode).json({ statusCode, message });
  }
}
