import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethodRepository } from './payment-method.repository';
import { PaymentMethodHelper } from './payment-method.helper';
import { PaymentMethodRequestDto } from './dto/payment-method.request.dto';
import { PaymentMethodResponseDto } from './dto/payment-method.response.dto';
import { DeleteListPaymentMethodDto } from './dto/delete-list-payment-method.dto';

@Injectable()
export class PaymentMethodService {
  constructor(
    private repository: PaymentMethodRepository,
    private helper: PaymentMethodHelper,
  ) {}

  async create(
    dto: PaymentMethodRequestDto,
  ): Promise<PaymentMethodResponseDto> {
    await this.helper.checkCodeUnique(dto);
    return this.repository.create(dto);
  }

  async update(
    id: number,
    dto: PaymentMethodRequestDto,
  ): Promise<PaymentMethodResponseDto> {
    await this.helper.checkExists(id);
    await this.helper.checkCodeUnique(dto); // check code unique khi update
    return this.repository.update(id, dto);
  }

  async getById(id: number): Promise<PaymentMethodResponseDto | null> {
    await this.helper.checkExists(id);
    return this.repository.getById(id);
  }

  async getAll(): Promise<PaymentMethodResponseDto[]> {
    const methods = await this.repository.getAll();
    return methods;
  }

  async delete(id: number): Promise<PaymentMethodResponseDto | null> {
    await this.helper.checkExists(id);
    return this.repository.delete(id);
  }

  async deleteList(
    dto: DeleteListPaymentMethodDto,
  ): Promise<{ count: number }> {
    return this.repository.deleteList(dto);
  }
}
