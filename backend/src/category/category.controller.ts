import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryRequestDto } from './dto/category.request.dto';
import { CategoryResponseDto } from './dto/category.response.dto';
import { Delete_list_categoryDto } from './dto/delete_list_category.dto';
import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter, multerStorage } from '../media/config/multer.config';
import { Express } from 'express';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multerStorage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async create(
    @Body() category: CategoryRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.create(category, file);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id/category')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multerStorage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() category: CategoryRequestDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.update(id, category, file);
  }

  @Get()
  async getAllCategory(): Promise<CategoryResponseDto[]> {
    return this.categoryService.getAllCategories();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CategoryResponseDto | null> {
    return this.categoryService.delete(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete()
  async deleteListCategories(
    @Body() listCategory: Delete_list_categoryDto,
  ): Promise<{ count: number }> {
    return this.categoryService.deleteList(listCategory);
  }

  // ENDPOINT UPLOAD ẢNH DANH MỤC RIÊNG
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
  ): Promise<CategoryResponseDto> {
    return this.categoryService.uploadImage(id, file);
  }
}
