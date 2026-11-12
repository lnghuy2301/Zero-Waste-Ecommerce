import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryRepository } from './category.repository';
import { CategoryHelper } from './category.helper';
import { CategoryRequestDto } from './dto/category.request.dto';
import { CategoryResponseDto } from './dto/category.response.dto';
import { Delete_list_categoryDto } from './dto/delete_list_category.dto';
import { Express } from 'express';

@Injectable()
export class CategoryService {
  constructor(
    private categoryRepository: CategoryRepository,
    private categoryHelper: CategoryHelper,
  ) {}

  async create(
    category: CategoryRequestDto,
    file?: Express.Multer.File,
  ): Promise<CategoryResponseDto> {
    const imagePath = file ? `/uploads/${file.filename}` : undefined;
    return this.categoryRepository.createCategory(category, imagePath);
  }

  async update(
    id: number,
    category: CategoryRequestDto,
    file?: Express.Multer.File,
  ): Promise<CategoryResponseDto> {
    await this.categoryHelper.checkCategory(id);
    const imagePath = file ? `/uploads/${file.filename}` : undefined;
    return this.categoryRepository.updateCategory(id, category, imagePath);
  }

  async getAllCategories(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.getAllCategories();
    return categories;
  }

  async delete(id: number): Promise<CategoryResponseDto | null> {
    await this.categoryHelper.checkCategory(id);
    return this.categoryRepository.deleteCategory(id);
  }

  async deleteList(
    listCategory: Delete_list_categoryDto,
  ): Promise<{ count: number }> {
    const result =
      await this.categoryRepository.deleteListCategory(listCategory);
    if (result.count === 0) {
      throw new NotFoundException('Không tìm thấy danh mục nào để xóa');
    }
    return result;
  }

  // HÀM UPLOAD ẢNH RIÊNG
  async uploadImage(
    id: number,
    file: Express.Multer.File,
  ): Promise<CategoryResponseDto> {
    await this.categoryHelper.checkCategory(id);
    return this.categoryRepository.uploadImage(id, file);
  }
}
