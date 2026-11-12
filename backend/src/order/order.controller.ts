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
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderRequestDto, UpdateOrderStatusDto } from './dto/order.request.dto';
import { OrderResponseDto } from './dto/order.response.dto';
import { DeleteListOrderDto } from './dto/delete-list-order.dto';
import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role, OrderStatus } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/demo-payment')
  async confirmDemoPayment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.orderService.confirmDemoPayment(id, req.user.id);
  }

  // 1. CÁC ROUTE TẠO MỚI / THỐNG KÊ (STATIC ROUTES)
  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(
    @Body() dto: OrderRequestDto,
    @Req() req: any,
  ): Promise<OrderResponseDto> {
    const userId = req.user.id;
    if (dto.accountId !== userId) {
      throw new ForbiddenException('Không được tạo đơn hàng cho người khác');
    }
    return this.orderService.createOrder(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats/count')
  async getOrderCount() {
    return this.orderService.getOrderCount();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats/revenue-by-month')
  async getRevenueByMonth() {
    return this.orderService.getRevenueByMonth();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats')
  @UsePipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: false,
    }),
  )
  async getStats() {
    return this.orderService.getStats();
  }

  // 2. CÁC ROUTE CÓ THAM SỐ CỤ THỂ (SUB-PATHS)
  @UseGuards(JwtAuthGuard)
  @Get('user/:accountId')
  async getOrdersByUser(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Req() req: any,
  ): Promise<OrderResponseDto[]> {
    const userId = req.user.id;
    if (userId !== accountId) {
      throw new ForbiddenException('Không được xem đơn hàng của người khác');
    }
    return this.orderService.getOrdersByUser(accountId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id/status')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.updateOrderStatus(id, dto.status);
  }

  // 3. CÁC ROUTE DÀNH CHO ADMIN (GET ALL / DELETE LIST)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async getAllOrders(): Promise<OrderResponseDto[]> {
    return this.orderService.getAllOrders();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete()
  async deleteListOrders(
    @Body() dto: DeleteListOrderDto,
  ): Promise<{ count: number }> {
    return this.orderService.deleteListOrders(dto);
  }

  // 4. CÁC ROUTE DÙNG THAM SỐ CHUNG (:id) PHẢI ĐỂ CUỐI CÙNG
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOrderById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<OrderResponseDto | null> {
    const userId = req.user.id;
    return this.orderService.getOrderById(id, userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<OrderResponseDto | null> {
    const userId = req.user.id;
    return this.orderService.cancelOrder(id, userId);
  }
}
