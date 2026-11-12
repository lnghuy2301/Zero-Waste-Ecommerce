import { Module } from '@nestjs/common';
import { ProductVariantController } from './product-variant.controller';
import { ProductVariantService } from './product-variant.service';
import { ProductVariantRepository } from './product-variant.repository';
import { ProductVariantHelper } from './product-variant.helper';
import { AccountHelper } from '../account/account.helper';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [AccountModule],
  controllers: [ProductVariantController],
  providers: [
    ProductVariantService,
    ProductVariantRepository,
    ProductVariantHelper,
    AccountHelper,
  ],
  exports: [
    ProductVariantService,
    ProductVariantRepository,
    ProductVariantHelper,
  ],
})
export class ProductVariantModule {}
