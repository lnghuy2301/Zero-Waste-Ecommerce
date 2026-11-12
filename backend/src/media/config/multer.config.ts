import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { BadRequestException } from '@nestjs/common';

export const multerStorage = diskStorage({
  destination: (req, file, callback) => {
    mkdirSync('./uploads', { recursive: true });
    callback(null, './uploads');
  },
  filename: (req, file, callback) =>
    callback(null, randomUUID() + extname(file.originalname).toLowerCase()),
});

const mimeTypes: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.mov': ['video/quicktime'],
  '.avi': ['video/x-msvideo', 'video/avi'],
  '.webm': ['video/webm'],
};
export const fileFilter = (req, file, callback) => {
  const allowed = mimeTypes[extname(file.originalname).toLowerCase()];
  if (!allowed?.includes(file.mimetype))
    return callback(
      new BadRequestException('Định dạng file hoặc MIME không được hỗ trợ'),
      false,
    );
  callback(null, true);
};
