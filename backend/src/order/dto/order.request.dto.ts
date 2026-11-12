import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrderDetailRequestDto {
  @IsInt()
  @Min(1)
  variantId: number;

  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;
}

export class OrderRequestDto {
  @IsInt()
  @Min(1)
  accountId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  shippingAddress: string;

  @IsInt()
  @Min(1)
  paymentMethodId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OrderDetailRequestDto)
  items: OrderDetailRequestDto[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
