import { Module } from '@nestjs/common';
import { PaymentMethodController } from './payment-method.controller';
import { PaymentMethodService } from './payment-method.service';
import { PaymentMethodRepository } from './payment-method.repository';
import { PaymentMethodHelper } from './payment-method.helper';

@Module({
  controllers: [PaymentMethodController],
  providers: [
    PaymentMethodService,
    PaymentMethodRepository,
    PaymentMethodHelper,
  ],
  exports: [PaymentMethodService, PaymentMethodRepository, PaymentMethodHelper],
})
export class PaymentMethodModule {}
