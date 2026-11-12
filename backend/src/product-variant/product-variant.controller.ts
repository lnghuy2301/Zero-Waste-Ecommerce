import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ProductVariantService } from './product-variant.service';
import { ProductVariantRequestDto } from './dto/product-variant.request.dto';
import { ProductVariantResponseDto } from './dto/product-variant.response.dto';
import { DeleteListProductVariantDto } from './dto/delete-list-product-variant.dto';
import { ApplyPromotionDto } from './dto/apply-promotion.dto';
import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter, multerStorage } from '../media/config/multer.config';
import { Express } from 'express';
@Controller('product-variant')
export class ProductVariantController {
  constructor(private readonly productVariantService: ProductVariantService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async createVariant(
    @Body() dto: ProductVariantRequestDto,
  ): Promise<ProductVariantResponseDto> {
    return this.productVariantService.createVariant(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  async updateVariant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProductVariantRequestDto,
  ): Promise<ProductVariantResponseDto> {
    return this.productVariantService.updateVariant(id, dto);
  }

  @Get(':id')
  async getVariantById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductVariantResponseDto | null> {
    return this.productVariantService.getVariantById(id);
  }

  @Get()
  async getAllVariants(): Promise<ProductVariantResponseDto[]> {
    return this.productVariantService.getAllVariants();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async deleteVariant(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductVariantResponseDto | null> {
    return this.productVariantService.deleteVariant(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete()
  async deleteListVariants(
    @Body() dto: DeleteListProductVariantDto,
  ): Promise<{ count: number }> {
    return this.productVariantService.deleteListVariants(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('apply-promotion')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async applyPromotion(@Body() dto: ApplyPromotionDto) {
    return this.productVariantService.applyPromotion(dto);
  }
  // === UPLOAD ẢNH CHO BIẾN THỂ ===
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multerStorage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadVariantImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không có file ảnh được upload');
    return this.productVariantService.uploadVariantImage(id, file);
  }

  // === XÓA ẢNH CỦA BIẾN THỂ ===
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id/image')
  async removeVariantImage(@Param('id', ParseIntPipe) id: number) {
    return this.productVariantService.removeVariantImage(id);
  }
}
