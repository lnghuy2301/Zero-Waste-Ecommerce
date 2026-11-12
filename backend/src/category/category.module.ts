import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CategoryHelper } from './category.helper';
import { CategoryRepository } from './category.repository';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [AccountModule],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository, CategoryHelper],
  exports: [CategoryService, CategoryRepository, CategoryHelper],
})
export class CategoryModule {}
