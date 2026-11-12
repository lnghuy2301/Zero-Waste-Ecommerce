import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { OrderHelper } from './order.helper';

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, OrderHelper],
  exports: [OrderService, OrderRepository, OrderHelper],
})
export class OrderModule {}
