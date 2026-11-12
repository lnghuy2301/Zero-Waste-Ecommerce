import { Module } from '@nestjs/common';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { PromotionRepository } from './promotion.repository';
import { PromotionHelper } from './promotion.helper';
import { AccountHelper } from '../account/account.helper';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [AccountModule],
  controllers: [PromotionController],
  providers: [
    PromotionService,
    PromotionRepository,
    PromotionHelper,
    AccountHelper,
  ],
  exports: [PromotionService, PromotionRepository, PromotionHelper],
})
export class PromotionModule {}
