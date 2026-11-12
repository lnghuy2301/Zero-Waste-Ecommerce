import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartRequestDto } from './dto/cart.request.dto';
import { CartResponseDto } from './dto/cart.response.dto';
import { DeleteListCartDto } from './dto/delete-list-cart.dto';
import { plainToInstance } from 'class-transformer';

const includeCart = {
  variant: { include: { product: true, promotion: true } },
};
function toResponse(item: any): CartResponseDto {
  return plainToInstance(CartResponseDto, {
    ...item,
    variant: {
      ...item.variant,
      price: Number(item.variant.price),
      promotion: item.variant.promotion
        ? {
            ...item.variant.promotion,
            discountValue: Number(item.variant.promotion.discountValue),
          }
        : null,
    },
  });
}

@Injectable()
export class CartRepository {
  constructor(private prismaService: PrismaService) {}

  async addToCart(data: CartRequestDto): Promise<CartResponseDto> {
    return this.prismaService.$transaction(async (tx) => {
      // Serialize cart edits per account without touching another customer's cart.
      await tx.$queryRaw`SELECT id FROM "TAI_KHOAN" WHERE id = ${data.accountId} FOR UPDATE`;
      const variant = await tx.productVariant.findUnique({
        where: { id: data.variantId },
        include: { product: true },
      });
      if (!variant || variant.product.status !== 'ACTIVE')
        throw new BadRequestException('Sản phẩm không khả dụng');
      const existing = await tx.cart.findFirst({
        where: { accountId: data.accountId, variantId: data.variantId },
      });
      const quantity = (existing?.quantity || 0) + data.quantity;
      if (quantity > 20 || quantity > variant.stock)
        throw new ConflictException(
          'Số lượng vượt quá tồn kho hoặc giới hạn 20 sản phẩm',
        );
      const item = existing
        ? await tx.cart.update({
            where: { id: existing.id },
            data: { quantity },
            include: includeCart,
          })
        : await tx.cart.create({
            data: {
              accountId: data.accountId,
              variantId: data.variantId,
              quantity,
            },
            include: includeCart,
          });
      return toResponse(item);
    });
  }

  async updateCartItem(
    id: number,
    data: CartRequestDto,
  ): Promise<CartResponseDto> {
    return this.prismaService.$transaction(async (tx) => {
      const item = await tx.cart.findUnique({ where: { id } });
      if (
        !item ||
        item.accountId !== data.accountId ||
        item.variantId !== data.variantId
      ) {
        throw new BadRequestException('Thông tin giỏ hàng không hợp lệ');
      }
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true },
      });
      if (
        !variant ||
        variant.product.status !== 'ACTIVE' ||
        data.quantity > variant.stock
      )
        throw new ConflictException('Sản phẩm không đủ tồn kho');
      return toResponse(
        await tx.cart.update({
          where: { id },
          data: { quantity: data.quantity },
          include: includeCart,
        }),
      );
    });
  }

  async getCartByUser(accountId: number): Promise<CartResponseDto[]> {
    const items = await this.prismaService.cart.findMany({
      where: { accountId },
      include: includeCart,
      orderBy: { id: 'desc' },
    });
    return items.map(toResponse);
  }

  async getCartItemById(id: number): Promise<CartResponseDto | null> {
    const item = await this.prismaService.cart.findUnique({
      where: { id },
      include: includeCart,
    });
    return item ? toResponse(item) : null;
  }

  async removeCartItem(id: number): Promise<CartResponseDto | null> {
    return toResponse(
      await this.prismaService.cart.delete({
        where: { id },
        include: includeCart,
      }),
    );
  }

  async clearCartItems(
    dto: DeleteListCartDto,
    accountId: number,
  ): Promise<{ count: number }> {
    return this.prismaService.cart.deleteMany({
      where: { id: { in: dto.Ids }, accountId },
    });
  }
}
