import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderRequestDto } from './dto/order.request.dto';
import { OrderResponseDto } from './dto/order.response.dto';
import { DeleteListOrderDto } from './dto/delete-list-order.dto';
import { plainToInstance } from 'class-transformer';
import { Prisma, OrderStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const includeOrder = {
  paymentMethod: true,
  orderItems: { include: { variant: { include: { product: true } } } },
} satisfies Prisma.OrderInclude;

function toResponse(order: any): OrderResponseDto {
  return plainToInstance(OrderResponseDto, {
    ...order,
    totalAmount: Number(order.totalAmount),
    orderItems: order.orderItems.map((item) => ({
      ...item,
      price: Number(item.price),
      variant: { ...item.variant, price: Number(item.variant.price) },
    })),
  });
}

@Injectable()
export class OrderRepository {
  constructor(private prismaService: PrismaService) {}

  async createOrder(dto: OrderRequestDto): Promise<OrderResponseDto> {
    // Merge repeated IDs before stock checks to prevent bypassing per-item limits.
    const quantities = new Map<number, number>();
    for (const item of dto.items) {
      const quantity = (quantities.get(item.variantId) || 0) + item.quantity;
      if (quantity > 20)
        throw new BadRequestException('Tối đa 20 sản phẩm mỗi biến thể');
      quantities.set(item.variantId, quantity);
    }
    const order = await this.prismaService.$transaction(async (tx) => {
      const payment = await tx.paymentMethod.findUnique({
        where: { id: dto.paymentMethodId },
      });
      if (!payment?.isActive)
        throw new BadRequestException('Phương thức thanh toán không khả dụng');
      const items: {
        variantId: number;
        quantity: number;
        price: Prisma.Decimal;
      }[] = [];
      let subtotal = new Prisma.Decimal(0);
      for (const [variantId, quantity] of [...quantities].sort(
        (a, b) => a[0] - b[0],
      )) {
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          include: { product: true, promotion: true },
        });
        if (!variant || variant.product.status !== 'ACTIVE') {
          throw new BadRequestException('Sản phẩm không khả dụng');
        }
        // Conditional decrement is atomic even when two checkouts run together.
        const reserved = await tx.productVariant.updateMany({
          where: { id: variantId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (reserved.count !== 1)
          throw new ConflictException('Sản phẩm không đủ tồn kho');
        let price = variant.price;
        const promo = variant.promotion;
        const now = new Date();
        if (promo?.isActive && promo.startDate <= now && promo.endDate >= now) {
          price =
            promo.discountType === 'PERCENT'
              ? price
                  .mul(new Prisma.Decimal(100).minus(promo.discountValue))
                  .div(100)
              : price.minus(promo.discountValue);
          price = Prisma.Decimal.max(0, price).toDecimalPlaces(2);
        }
        subtotal = subtotal.plus(price.mul(quantity));
        items.push({ variantId, quantity, price });
      }
      const shipping = subtotal.gte(500000) || subtotal.isZero() ? 0 : 30000;
      return tx.order.create({
        data: {
          code: 'ORD-' + randomBytes(8).toString('hex'),
          accountId: dto.accountId,
          totalAmount: subtotal.plus(shipping),
          status: OrderStatus.PENDING,
          shippingAddress: dto.shippingAddress,
          paymentMethodId: payment.id,
          orderItems: { create: items },
        },
        include: includeOrder,
      });
    });
    return toResponse(order);
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    if (status === OrderStatus.CANCELLED) return this.cancelOrder(id);
    return this.prismaService.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
      if (order.status === status)
        return toResponse(
          await tx.order.findUniqueOrThrow({
            where: { id },
            include: includeOrder,
          }),
        );
      const allowed: Record<OrderStatus, OrderStatus[]> = {
        PENDING: [OrderStatus.PAID, OrderStatus.SHIPPING],
        PAID: [OrderStatus.SHIPPING],
        SHIPPING: [OrderStatus.COMPLETED],
        COMPLETED: [],
        CANCELLED: [],
      };
      if (!allowed[order.status].includes(status))
        throw new BadRequestException(
          'Chuyển trạng thái đơn hàng không hợp lệ',
        );
      const result = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status },
      });
      if (result.count !== 1)
        throw new ConflictException('Đơn hàng vừa thay đổi, vui lòng tải lại');
      if (status === OrderStatus.COMPLETED) {
        const items = await tx.orderDetail.findMany({
          where: { orderId: id },
          include: { variant: true },
        });
        for (const item of items) {
          await tx.product.update({
            where: { id: item.variant.productId },
            data: { soLuongDaBan: { increment: item.quantity } },
          });
        }
      }
      return toResponse(
        await tx.order.findUniqueOrThrow({
          where: { id },
          include: includeOrder,
        }),
      );
    });
  }

  async confirmDemoPayment(
    id: number,
    accountId: number,
  ): Promise<OrderResponseDto> {
    if (
      process.env.DEMO_PAYMENTS !== 'true' ||
      process.env.NODE_ENV === 'production'
    ) {
      throw new ForbiddenException('Thanh toán mô phỏng chưa được bật');
    }
    const order = await this.prismaService.order.findUnique({
      where: { id },
      include: { paymentMethod: true },
    });
    if (!order || order.accountId !== accountId) throw new ForbiddenException();
    if (!['MOMO_DEMO', 'PAYPAL_DEMO'].includes(order.paymentMethod.code))
      throw new BadRequestException('Đơn hàng không dùng thanh toán mô phỏng');
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAID
    )
      throw new BadRequestException('Đơn hàng không thể thanh toán');
    return this.updateOrderStatus(id, OrderStatus.PAID);
  }

  async cancelOrder(id: number): Promise<OrderResponseDto> {
    return this.prismaService.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { orderItems: true },
      });
      if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
      if (order.status !== OrderStatus.PENDING)
        throw new BadRequestException('Chỉ hủy đơn hàng đang chờ xử lý');
      const updated = await tx.order.updateMany({
        where: { id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED },
      });
      if (updated.count !== 1)
        throw new ConflictException('Đơn hàng vừa thay đổi');
      for (const item of order.orderItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      }
      return toResponse(
        await tx.order.findUniqueOrThrow({
          where: { id },
          include: includeOrder,
        }),
      );
    });
  }

  async getOrdersByUser(accountId: number): Promise<OrderResponseDto[]> {
    const orders = await this.prismaService.order.findMany({
      where: { accountId },
      include: includeOrder,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(toResponse);
  }

  async getOrderById(id: number): Promise<OrderResponseDto | null> {
    const order = await this.prismaService.order.findUnique({
      where: { id },
      include: includeOrder,
    });
    return order ? toResponse(order) : null;
  }

  async getAllOrders(): Promise<OrderResponseDto[]> {
    const orders = await this.prismaService.order.findMany({
      include: includeOrder,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(toResponse);
  }

  async deleteListOrders(dto: DeleteListOrderDto): Promise<{ count: number }> {
    // Pending orders reserve stock; never delete them outside the cancel workflow.
    return this.prismaService.order.deleteMany({
      where: {
        id: { in: dto.Ids },
        status: { in: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
      },
    });
  }

  async getOrderCount(): Promise<number> {
    return this.prismaService.order.count();
  }

  async getRevenueByMonth() {
    const year = new Date().getUTCFullYear();
    const orders = await this.prismaService.order.findMany({
      where: {
        status: OrderStatus.COMPLETED,
        createdAt: {
          gte: new Date(Date.UTC(year, 0)),
          lt: new Date(Date.UTC(year + 1, 0)),
        },
      },
      select: { createdAt: true, totalAmount: true },
    });
    const monthly = Array<number>(12).fill(0);
    for (const order of orders)
      monthly[order.createdAt.getUTCMonth()] += Number(order.totalAmount);
    return monthly;
  }

  async getStats() {
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      revenue,
      monthlyRevenue,
      statuses,
    ] = await Promise.all([
      this.prismaService.account.count(),
      this.prismaService.order.count(),
      this.prismaService.product.count(),
      this.prismaService.order.aggregate({
        where: { status: OrderStatus.COMPLETED },
        _sum: { totalAmount: true },
      }),
      this.getRevenueByMonth(),
      this.prismaService.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);
    return {
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue: Number(revenue._sum.totalAmount || 0),
      monthlyRevenue,
      statusCount: Object.fromEntries(
        statuses.map((s) => [s.status, s._count.id]),
      ),
    };
  }
}
