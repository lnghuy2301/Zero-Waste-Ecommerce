import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PromotionRepository } from './promotion.repository';
import { PromotionHelper } from './promotion.helper';
import { PromotionRequestDto } from './dto/promotion.request.dto';
import { PromotionResponseDto } from './dto/promotion.response.dto';
import { DeleteListPromotionDto } from './dto/delete-list-promotion.dto';

@Injectable()
export class PromotionService {
  constructor(
    private promotionRepository: PromotionRepository,
    private promotionHelper: PromotionHelper,
  ) {}

  async create(dto: PromotionRequestDto): Promise<PromotionResponseDto> {
    this.validatePromotion(dto);
    return this.promotionRepository.createPromotion(dto);
  }

  async update(
    id: number,
    dto: PromotionRequestDto,
  ): Promise<PromotionResponseDto> {
    this.validatePromotion(dto);
    await this.promotionHelper.checkPromotion(id);
    return this.promotionRepository.updatePromotion(id, dto);
  }

  async getById(id: number): Promise<PromotionResponseDto | null> {
    const promotion = await this.promotionRepository.getPromotionById(id);
    if (!promotion) {
      throw new NotFoundException('Khuyến mãi không tồn tại');
    }
    return promotion;
  }

  async getAll(): Promise<PromotionResponseDto[]> {
    const promotions = await this.promotionRepository.getAllPromotions();
    return promotions;
  }

  private validatePromotion(dto: PromotionRequestDto) {
    if (new Date(dto.endDate) <= new Date(dto.startDate))
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    if (dto.discountType === 'PERCENT' && Number(dto.discountValue) > 100)
      throw new BadRequestException('Phần trăm giảm giá không vượt quá 100');
  }

  async delete(id: number): Promise<PromotionResponseDto | null> {
    await this.promotionHelper.checkPromotion(id);
    return this.promotionRepository.deletePromotion(id);
  }

  async deleteList(dto: DeleteListPromotionDto): Promise<{ count: number }> {
    const result = await this.promotionRepository.deleteListPromotions(dto);
    if (result.count === 0) {
      throw new NotFoundException('Không tìm thấy khuyến mãi nào để xóa');
    }
    return result;
  }
}
