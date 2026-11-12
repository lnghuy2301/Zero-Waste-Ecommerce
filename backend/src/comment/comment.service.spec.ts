import { ForbiddenException } from '@nestjs/common';
import { CommentService } from './comment.service';

describe('verified reviews', () => {
  it('rejects reviews without a completed purchase', async () => {
    const prisma = {
      order: { findFirst: jest.fn().mockResolvedValue(null) },
      comment: { create: jest.fn() },
    };
    const service = new CommentService(prisma as any, {} as any);
    await expect(
      service.create(2, 1, { content: 'demo', rating: 5 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });
});
