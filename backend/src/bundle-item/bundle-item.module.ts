import { Module } from '@nestjs/common';
import { BundleItemController } from './bundle-item.controller';
import { BundleItemService } from './bundle-item.service';
import { BundleItemRepository } from './bundle-item.repository';
import { BundleItemHelper } from './bundle-item.helper';

@Module({
  controllers: [BundleItemController],
  providers: [BundleItemService, BundleItemRepository, BundleItemHelper],
  exports: [BundleItemService, BundleItemRepository, BundleItemHelper],
})
export class BundleItemModule {}
