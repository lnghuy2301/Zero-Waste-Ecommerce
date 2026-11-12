import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { CartHelper } from './cart.helper';
import { CartRequestDto } from './dto/cart.request.dto';
import { CartResponseDto } from './dto/cart.response.dto';
import { DeleteListCartDto } from './dto/delete-list-cart.dto';

@Injectable()
export class CartService {
  constructor(
    private cartRepository: CartRepository,
    private cartHelper: CartHelper,
  ) {}

  async create(dto: CartRequestDto, userId: number): Promise<CartResponseDto> {
    if (dto.accountId !== userId) {
      throw new ForbiddenException(
        'Không được thêm vào giỏ hàng của người khác',
      );
    }
    return this.cartRepository.addToCart(dto);
  }

  async update(
    id: number,
    dto: CartRequestDto,
    userId: number,
  ): Promise<CartResponseDto> {
    const item = await this.cartHelper.checkCartItem(id);
    if (item.accountId !== userId) {
      throw new ForbiddenException('Không được sửa giỏ hàng của người khác');
    }
    return this.cartRepository.updateCartItem(id, dto);
  }

  async getByUser(accountId: number): Promise<CartResponseDto[]> {
    const items = await this.cartRepository.getCartByUser(accountId);
    return items;
  }

  async getById(id: number, userId: number): Promise<CartResponseDto | null> {
    const item = await this.cartRepository.getCartItemById(id);
    if (!item) {
      throw new NotFoundException('Mặt hàng không tồn tại trong giỏ');
    }
    if (item.accountId !== userId) {
      throw new ForbiddenException('Không được xem mặt hàng của người khác');
    }
    return item;
  }

  async delete(id: number, userId: number): Promise<CartResponseDto | null> {
    const item = await this.cartHelper.checkCartItem(id);
    if (item.accountId !== userId) {
      throw new ForbiddenException('Không được xóa giỏ hàng của người khác');
    }
    return this.cartRepository.removeCartItem(id);
  }

  async deleteList(
    dto: DeleteListCartDto,
    userId: number,
  ): Promise<{ count: number }> {
    const result = await this.cartRepository.clearCartItems(dto, userId);
    return result;
  }
}
