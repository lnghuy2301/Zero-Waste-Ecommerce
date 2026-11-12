import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, OrderStatus } from '@prisma/client';
import { OrderRepository } from './order.repository';

describe('checkout invariants', () => {
  let tx: any;
  let repo: OrderRepository;
  const dto = {
    accountId: 2,
    paymentMethodId: 1,
    shippingAddress: 'Demo address',
    items: [{ variantId: 4, quantity: 1 }],
  };
  beforeEach(() => {
    tx = {
      paymentMethod: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, isActive: true }),
      },
      productVariant: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            price: new Prisma.Decimal(100000),
            product: { status: 'ACTIVE' },
            promotion: null,
          }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
      order: {
        create: jest
          .fn()
          .mockImplementation(async ({ data }) => ({
            ...data,
            id: 1,
            orderItems: data.orderItems.create.map((item) => ({
              ...item,
              variant: { price: item.price },
            })),
          })),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    repo = new OrderRepository({
      ...tx,
      $transaction: async (fn) => fn(tx),
    } as any);
  });

  it('refuses checkout after another buyer consumes the last unit', async () => {
    tx.productVariant.updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.createOrder(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('merges repeated variants before checking the per-variant limit', async () => {
    await expect(
      repo.createOrder({
        ...dto,
        items: [
          { variantId: 4, quantity: 15 },
          { variantId: 4, quantity: 6 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('calculates active discounts and shipping on the server', async () => {
    tx.productVariant.findUnique.mockResolvedValue({
      price: new Prisma.Decimal(100000),
      product: { status: 'ACTIVE' },
      promotion: {
        isActive: true,
        startDate: new Date(0),
        endDate: new Date('2099-01-01'),
        discountType: 'PERCENT',
        discountValue: new Prisma.Decimal(10),
      },
    });
    const order = await repo.createOrder(dto);
    expect(order.totalAmount).toBe(120000);
    expect(order.orderItems[0].price).toBe(90000);
  });

  it('does not discount an expired promotion', async () => {
    tx.productVariant.findUnique.mockResolvedValue({
      price: new Prisma.Decimal(100000),
      product: { status: 'ACTIVE' },
      promotion: {
        isActive: true,
        startDate: new Date(0),
        endDate: new Date(1),
        discountType: 'PERCENT',
        discountValue: new Prisma.Decimal(90),
      },
    });
    expect((await repo.createOrder(dto)).totalAmount).toBe(130000);
  });

  it('does not restore stock twice for simultaneous cancellations', async () => {
    tx.order.findUnique.mockResolvedValue({
      status: OrderStatus.PENDING,
      orderItems: [{ variantId: 4, quantity: 1 }],
    });
    tx.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.cancelOrder(1)).rejects.toBeInstanceOf(ConflictException);
    expect(tx.productVariant.update).not.toHaveBeenCalled();
  });

  it('disables demo payments in production even if enabled by mistake', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(repo.confirmDemoPayment(1, 2)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
