import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OrderRequestDto } from './order.request.dto';

describe('checkout request validation', () => {
  const base = { accountId: 1, paymentMethodId: 1, shippingAddress: 'Demo' };
  it.each(
    [
      [],
      [{ variantId: 1, quantity: -1 }],
      [{ variantId: 1, quantity: 1.5 }],
      [{ variantId: 1, quantity: 21 }],
      [{ variantId: '1', quantity: 1 }],
      [{ variantId: 1, quantity: 1, price: 0 }],
    ].map((items) => ({ items })),
  )('rejects invalid or client-priced items: %j', async ({ items }) => {
    expect(
      (
        await validate(plainToInstance(OrderRequestDto, { ...base, items }), {
          whitelist: true,
          forbidNonWhitelisted: true,
        })
      ).length,
    ).toBeGreaterThan(0);
  });
});
