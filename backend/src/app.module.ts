import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';

import { PrismaModule } from '../prisma/prisma.module';

// Thêm các module cần thiết
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { PromotionModule } from './promotion/promotion.module';
import { GreenCertificateModule } from './green-certificate/green-certificate.module';
import { CustomerProfileModule } from './customer_profile/customer_profile.module';
import { ProductVariantModule } from './product-variant/product-variant.module';
import { CartModule } from './cart/cart.module';
import { BundleItemModule } from './bundle-item/bundle-item.module';
import { OrderModule } from './order/order.module';
import { CommentModule } from './comment/comment.module';
import { PaymentMethodModule } from './payment_method/payment-method.module';
import { MediaModule } from './media/media.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccountModule,
    CategoryModule,
    ProductModule,
    CustomerProfileModule,
    PromotionModule,
    GreenCertificateModule,
    ProductVariantModule,
    CartModule,
    BundleItemModule,
    OrderModule,
    CommentModule,
    PaymentMethodModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
