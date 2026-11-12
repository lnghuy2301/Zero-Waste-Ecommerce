import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { BundleItemService } from './bundle-item.service';
import { BundleItemRequestDto } from './dto/bundle-item.request.dto';
import { BundleItemResponseDto } from './dto/bundle-item.response.dto';
import { DeleteListBundleItemDto } from './dto/delete-list-bundle-item.dto';
import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter, multerStorage } from '../media/config/multer.config';
import type { Express } from 'express';

@Controller('bundle-item')
export class BundleItemController {
  constructor(private readonly bundleItemService: BundleItemService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async createBundleItem(
    @Body() dto: BundleItemRequestDto,
  ): Promise<BundleItemResponseDto> {
    return this.bundleItemService.createBundleItem(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  async updateBundleItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BundleItemRequestDto,
  ): Promise<BundleItemResponseDto> {
    return this.bundleItemService.updateBundleItem(id, dto);
  }

  @Get(':id')
  async getBundleItemById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BundleItemResponseDto | null> {
    return this.bundleItemService.getBundleItemById(id);
  }

  @Get()
  async getAllBundleItems(
    @Query('bundleProductId', new ParseIntPipe({ optional: true }))
    bundleProductId?: number,
  ): Promise<BundleItemResponseDto[]> {
    return this.bundleItemService.getBundleItems(bundleProductId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async deleteBundleItem(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<BundleItemResponseDto | null> {
    return this.bundleItemService.deleteBundleItem(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete()
  async deleteListBundleItems(
    @Body() dto: DeleteListBundleItemDto,
  ): Promise<{ count: number }> {
    return this.bundleItemService.deleteListBundleItems(dto);
  }

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
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.bundleItemService.uploadImage(id, file);
  }
}
