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
  BadRequestException,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductRequestDto } from './dto/product.request.dto';
import { ProductResponseDto } from './dto/product.response.dto';
import { DeleteListProductDto } from './dto/list_product_delete.dto';
import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter, multerStorage } from '../media/config/multer.config';
import { Express } from 'express';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async createProduct(
    @Body() dto: ProductRequestDto,
  ): Promise<ProductResponseDto> {
    return this.productService.createProduct(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  async updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProductRequestDto,
  ): Promise<ProductResponseDto> {
    return this.productService.updateProduct(id, dto);
  }

  @Get(':id')
  async getProductById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductResponseDto | null> {
    return this.productService.getProductById(id);
  }

  @Get()
  async getAllProducts(
    @Query() query: ProductQueryDto,
  ): Promise<ProductResponseDto[]> {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException(
        'Giá tối thiểu không được lớn hơn giá tối đa',
      );
    }
    return this.productService.getAllProducts(
      query.search,
      query.categoryId,
      query.minPrice,
      query.maxPrice,
      query.material,
      query.greenCertId,
      query.minEco,
      query.minRating,
      query.sort,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async deleteProduct(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductResponseDto | null> {
    return this.productService.deleteProduct(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete()
  async deleteListProducts(
    @Body() dto: DeleteListProductDto,
  ): Promise<{ count: number }> {
    return this.productService.deleteListProducts(dto);
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
  async uploadMainImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không có file ảnh được upload');
    return this.productService.uploadMainImage(id, file);
  }

  // === ENDPOINT MỚI CHO ADMIN DASHBOARD ===
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats/count')
  async getProductCount() {
    return this.productService.getProductCount();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats/inventory')
  async getTotalInventory() {
    return this.productService.getTotalInventory();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats/sold')
  async getTotalSold() {
    return this.productService.getTotalSold();
  }

  // === CHO PHÉP KHÁCH HÀNG XEM SỐ LƯỢNG ĐÃ BÁN THỰC TẾ ===
  @Get('stats/sold-variants')
  async getSoldVariantsDetails() {
    return this.productService.getSoldVariantsDetails();
  }

  @Get('stats/sold-products')
  async getSoldProductsDetails() {
    return this.productService.getSoldProductsDetails();
  }
}
