import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MediaService } from './media.service';

describe('review attachments', () => {
  it('rejects an absent upload', async () => {
    await expect(
      new MediaService({} as any).uploadReviewMedia(1, 1, undefined as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('prevents attaching files to another customer review', async () => {
    const prisma = {
      comment: { findUnique: jest.fn().mockResolvedValue({ accountId: 2 }) },
      reviewMedia: { create: jest.fn() },
    };
    await expect(
      new MediaService(prisma as any).uploadReviewMedia(1, 4, {
        mimetype: 'image/png',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.reviewMedia.create).not.toHaveBeenCalled();
  });
  it('does not delete another customer attachment', async () => {
    const prisma = {
      reviewMedia: {
        findUnique: jest.fn().mockResolvedValue({ comment: { accountId: 2 } }),
        delete: jest.fn(),
      },
    };
    await expect(
      new MediaService(prisma as any).deleteReviewMedia(1, 4),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.reviewMedia.delete).not.toHaveBeenCalled();
  });
});
