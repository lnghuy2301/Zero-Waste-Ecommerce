import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Express } from 'express';
import { removeUpload } from './config/remove-upload';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async uploadReviewMedia(
    userId: number,
    commentId: number,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Không tìm thấy file upload');
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Không tìm thấy bình luận.');
    }

    if (comment.accountId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền upload media cho bình luận này.',
      );
    }

    const fileType = file.mimetype?.startsWith('image') ? 'IMAGE' : 'VIDEO';

    return this.prisma.reviewMedia.create({
      data: {
        commentId,
        url: `/uploads/${file.filename}`,
        type: fileType,
      },
    });
  }

  async deleteReviewMedia(userId: number, mediaId: number) {
    const media = await this.prisma.reviewMedia.findUnique({
      where: { id: mediaId },
      include: { comment: true },
    });

    if (!media) {
      throw new NotFoundException('Không tìm thấy media.');
    }

    if (media.comment.accountId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa media này.');
    }

    await this.prisma.reviewMedia.delete({ where: { id: mediaId } });
    await removeUpload(media.url);

    return { message: 'Xóa media thành công.' };
  }
}
