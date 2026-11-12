import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { GetCommentsFilterDto } from './dto/get-comments-filter.dto';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role } from '@prisma/client';
import { IsBoolean } from 'class-validator';

class VisibilityDto {
  @IsBoolean()
  isHidden: boolean;
}

@ApiTags('Comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async findAllPublic(@Query('productId', ParseIntPipe) productId: number) {
    return this.commentService.findAllForUser(productId);
  }

  // 2. Route riêng cho Admin (Thấy được cả ẩn/hiện và lọc theo ý muốn)
  @Get('admin/all')
  @UseGuards(AuthGuard('jwt')) // Bắt buộc đăng nhập
  async findAllAdmin(
    @Query() filterDto: GetCommentsFilterDto,
    @Req() req: any,
  ) {
    // Check quyền admin ở đây lần nữa cho chắc
    const user = req.user;
    if (user.role !== 'ADMIN' && user.roleId !== 1) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
    return this.commentService.findAllForAdmin(filterDto);
  }

  @Post('product/:productId')
  @ApiOperation({ summary: 'Tạo đánh giá mới' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException('Vui lòng đăng nhập');
    return this.commentService.create(userId, productId, createCommentDto);
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: 'Admin thay đổi trạng thái ẩn/hiện bình luận' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  async toggleVisibility(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: VisibilityDto,
  ) {
    return this.commentService.toggleVisibility(id, body.isHidden);
  }
}
