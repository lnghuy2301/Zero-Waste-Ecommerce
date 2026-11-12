import {
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { fileFilter, multerStorage } from './config/multer.config';
import { MediaService } from './media.service';
import { Express } from 'express';
import type { Multer } from 'multer';

@ApiTags('Media')
@Controller()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('comments/:commentId/media')
  @ApiOperation({ summary: 'Upload ảnh hoặc video cho bình luận' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerStorage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadReviewMedia(
    @Param('commentId', ParseIntPipe) commentId: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không xác định được người dùng');
    }

    return this.mediaService.uploadReviewMedia(userId, commentId, file);
  }

  @Delete('media/:mediaId')
  @ApiOperation({ summary: 'Xóa media khỏi bình luận' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async deleteReviewMedia(
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Không xác định được người dùng');
    }

    return this.mediaService.deleteReviewMedia(userId, mediaId);
  }
}
