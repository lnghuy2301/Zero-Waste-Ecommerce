import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductVariantRepository } from './product-variant.repository';
import { ProductVariantHelper } from './product-variant.helper';
import { ProductVariantRequestDto } from './dto/product-variant.request.dto';
import { ProductVariantResponseDto } from './dto/product-variant.response.dto';
import { DeleteListProductVariantDto } from './dto/delete-list-product-variant.dto';
import { ApplyPromotionDto } from './dto/apply-promotion.dto';
@Injectable()
export class ProductVariantService {
  constructor(
    private productVariantRepository: ProductVariantRepository,
    private productVariantHelper: ProductVariantHelper,
  ) {}

  async createVariant(
    dto: ProductVariantRequestDto,
  ): Promise<ProductVariantResponseDto> {
    if (!Number.isInteger(dto.productId) || dto.productId < 1)
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    if (typeof dto.price !== 'number' || dto.price <= 0) {
      throw new BadRequestException('Giá phải là số dương hợp lệ');
    }
    return this.productVariantRepository.createVariant(dto);
  }

  async updateVariant(
    id: number,
    dto: ProductVariantRequestDto,
  ): Promise<ProductVariantResponseDto> {
    if (typeof dto.price !== 'number' || dto.price <= 0) {
      throw new BadRequestException('Giá phải là số dương hợp lệ');
    }
    await this.productVariantHelper.checkVariant(id);
    return this.productVariantRepository.updateVariant(id, dto);
  }

  async getVariantById(id: number): Promise<ProductVariantResponseDto | null> {
    const variant = await this.productVariantRepository.getVariantById(id);
    if (!variant) {
      throw new NotFoundException('Biến thể sản phẩm không tồn tại');
    }
    return variant;
  }

  async getAllVariants(): Promise<ProductVariantResponseDto[]> {
    const variants = await this.productVariantRepository.getAllVariants();
    return variants;
  }

  async deleteVariant(id: number): Promise<ProductVariantResponseDto | null> {
    await this.productVariantHelper.checkVariant(id);
    return this.productVariantRepository.deleteVariant(id);
  }

  async deleteListVariants(
    dto: DeleteListProductVariantDto,
  ): Promise<{ count: number }> {
    const result = await this.productVariantRepository.deleteListVariants(dto);
    if (result.count === 0) {
      throw new NotFoundException('Không tìm thấy biến thể nào để xóa');
    }
    return result;
  }

  async applyPromotion(dto: ApplyPromotionDto) {
    return this.productVariantRepository.applyPromotion(dto);
  }

  async uploadVariantImage(id: number, file: Express.Multer.File) {
    await this.productVariantHelper.checkVariant(id); // kiểm tra biến thể tồn tại
    return this.productVariantRepository.uploadVariantImage(id, file);
  }

  async removeVariantImage(id: number) {
    await this.productVariantHelper.checkVariant(id);
    return this.productVariantRepository.removeVariantImage(id);
  }
}
