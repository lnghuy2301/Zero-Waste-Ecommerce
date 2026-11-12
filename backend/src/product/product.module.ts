import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { ProductHelper } from './product.helper';
import { AccountHelper } from '../account/account.helper';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [AccountModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, ProductHelper, AccountHelper],
  exports: [ProductService, ProductRepository, ProductHelper],
})
export class ProductModule {}
