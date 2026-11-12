const { PrismaClient, OrderStatus } = require('@prisma/client');
const { hash } = require('bcrypt');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
require('dotenv').config({ path: join(__dirname, '../.env') });
const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Demo seed is disabled in production.');
  const catalogue = JSON.parse(
    readFileSync(join(__dirname, '../../data/catalogue.json'), 'utf8'),
  );
  const categories = new Map();
  for (const category of catalogue.categories) {
    const { key, ...data } = category;
    let record = await prisma.category.findFirst({
      where: { name: data.name },
    });
    if (!record) record = await prisma.category.create({ data });
    categories.set(key, record.id);
  }
  const now = new Date();
  const promo = await prisma.promotion.upsert({
    where: { code: 'GREENDEMO10' },
    update: {},
    create: {
      code: 'GREENDEMO10',
      name: 'Chào bạn sống xanh (demo)',
      discountType: 'PERCENT',
      discountValue: 10,
      startDate: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)),
      isActive: true,
    },
  });
  const variants = [];
  const products = [];
  for (const [index, product] of catalogue.products.entries()) {
    const {
      variants: sourceVariants,
      category,
      illustration,
      ...data
    } = product;
    const record = await prisma.product.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        categoryId: categories.get(category),
        status: 'ACTIVE',
        type: 'RETAIL',
      },
    });
    products.push(record);
    for (const variant of sourceVariants) {
      variants.push(
        await prisma.productVariant.upsert({
          where: { sku: variant.sku },
          update: {},
          create: {
            ...variant,
            productId: record.id,
            promotionId: index % 4 === 0 ? promo.id : null,
          },
        }),
      );
    }
  }
  const methods = [];
  for (const [code, name] of [
    ['COD', 'Thanh toán khi nhận hàng'],
    ['MOMO_DEMO', 'MoMo (mô phỏng)'],
    ['PAYPAL_DEMO', 'PayPal (mô phỏng)'],
  ]) {
    methods.push(
      await prisma.paymentMethod.upsert({
        where: { code },
        update: {},
        create: { code, name },
      }),
    );
  }
  const password = await hash(process.env.DEMO_PASSWORD || 'EcoDemo123!', 10);
  const accounts = [];
  for (const [email, fullName, role] of [
    ['admin@example.com', 'Quản trị demo', 'ADMIN'],
    ['customer@example.com', 'Khách hàng demo', 'CUSTOMER'],
    ['an.demo@example.com', 'Minh An (mô phỏng)', 'CUSTOMER'],
    ['linh.demo@example.com', 'Hà Linh (mô phỏng)', 'CUSTOMER'],
  ]) {
    accounts.push(
      await prisma.account.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password,
          role,
          isActive: true,
          profile: {
            create: {
              fullName,
              phone: '0900000000',
              address: '123 Đường Sống Xanh, Phường Minh Họa, TP. Demo',
            },
          },
        },
      }),
    );
  }
  const statuses = [
    OrderStatus.COMPLETED,
    OrderStatus.COMPLETED,
    OrderStatus.SHIPPING,
    OrderStatus.PENDING,
    OrderStatus.CANCELLED,
  ];
  // New demo orders reserve stock once; rerunning the seed never resets real changes.
  for (let i = 0; i < 15; i++) {
    const code = 'DEMO-' + String(i + 1).padStart(4, '0');
    if (await prisma.order.findUnique({ where: { code } })) continue;
    const variant = variants[i % variants.length];
    const status = statuses[i % statuses.length];
    const account = accounts[1 + (i % 3)];
    const quantity = 1 + (i % 2);
    const subtotal = Number(variant.price) * quantity;
    const totalAmount = subtotal + (subtotal >= 500000 ? 0 : 30000);
    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          code,
          accountId: account.id,
          totalAmount,
          status,
          shippingAddress:
            account.email + ' - 0900000000 - 123 Đường Sống Xanh, TP. Demo',
          paymentMethodId: methods[0].id,
          createdAt: new Date(
            Date.UTC(now.getUTCFullYear(), i % (now.getUTCMonth() + 1), 2 + i),
          ),
          orderItems: {
            create: { variantId: variant.id, quantity, price: variant.price },
          },
        },
      });
      if (status !== OrderStatus.CANCELLED)
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: quantity } },
        });
      if (status === OrderStatus.COMPLETED) {
        await tx.product.update({
          where: { id: variant.productId },
          data: { soLuongDaBan: { increment: quantity } },
        });
        await tx.comment.create({
          data: {
            accountId: account.id,
            productId: variant.productId,
            content: [
              'Dữ liệu demo: đóng gói gọn, dễ sử dụng.',
              'Dữ liệu demo: chất liệu đẹp, sẽ dùng lại hằng ngày.',
              'Dữ liệu demo: phù hợp mang theo đi làm.',
            ][i % 3],
            rating: 4 + (i % 2),
          },
        });
      }
    });
  }
  for (const product of products) {
    const rating = await prisma.comment.aggregate({
      where: { productId: product.id, isHidden: false },
      _avg: { rating: true },
      _count: { id: true },
    });
    await prisma.product.update({
      where: { id: product.id },
      data: {
        danhGiaTrungBinh: rating._avg.rating || 0,
        soLuongDanhGia: rating._count.id,
      },
    });
  }
  console.log(
    'Demo ready: 18 products, 36 variants, 6 categories, 4 accounts and 15 sample orders.',
  );
  console.log(
    'Login: admin@example.com or customer@example.com; password: DEMO_PASSWORD or EcoDemo123!',
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
