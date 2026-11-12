import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { OrderHelper } from './order.helper';
import { OrderRequestDto } from './dto/order.request.dto';
import { OrderResponseDto } from './dto/order.response.dto';
import { DeleteListOrderDto } from './dto/delete-list-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private orderHelper: OrderHelper,
  ) {}

  async createOrder(dto: OrderRequestDto): Promise<OrderResponseDto> {
    return this.orderRepository.createOrder(dto);
  }

  async confirmDemoPayment(id: number, accountId: number) {
    return this.orderRepository.confirmDemoPayment(id, accountId);
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    await this.orderHelper.checkOrder(id); // chỉ check tồn tại
    return this.orderRepository.updateOrderStatus(id, status);
  }

  async getOrdersByUser(accountId: number): Promise<OrderResponseDto[]> {
    return this.orderRepository.getOrdersByUser(accountId);
  }

  async getOrderById(
    id: number,
    userId: number,
    role = 'CUSTOMER',
  ): Promise<OrderResponseDto | null> {
    const order = await this.orderHelper.checkOrder(id);
    if (order.accountId !== userId && role !== 'ADMIN') {
      throw new ForbiddenException('Không được xem đơn hàng của người khác');
    }
    return order;
  }

  async cancelOrder(
    id: number,
    userId: number,
  ): Promise<OrderResponseDto | null> {
    const order = await this.orderHelper.checkOrder(id);
    if (order.accountId !== userId) {
      throw new ForbiddenException('Không được hủy đơn hàng của người khác');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ hủy được đơn hàng ở trạng thái PENDING',
      );
    }
    return this.orderRepository.cancelOrder(id);
  }

  async deleteListOrders(dto: DeleteListOrderDto): Promise<{ count: number }> {
    const result = await this.orderRepository.deleteListOrders(dto);
    if (result.count === 0) {
      throw new NotFoundException('Không tìm thấy đơn hàng nào để xóa');
    }
    return result;
  }

  async getOrderCount(): Promise<number> {
    return this.orderRepository.getOrderCount();
  }
  async getRevenueByMonth() {
    return this.orderRepository.getRevenueByMonth();
  }
  async getAllOrders(): Promise<OrderResponseDto[]> {
    return this.orderRepository.getAllOrders();
  }
  async getStats() {
    return this.orderRepository.getStats();
  }
}
