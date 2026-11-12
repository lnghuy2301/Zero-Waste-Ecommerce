import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { GreenCertificateRepository } from './green-certificate.repository';
import { GreenCertificateHelper } from './green-certificate.helper';
import { GreenCertificateRequestDto } from './dto/green-certificate.request.dto';
import { GreenCertificateResponseDto } from './dto/green-certificate.response.dto';
import { DeleteListGreenCertificateDto } from './dto/delete-list-green-certificate.dto';

@Injectable()
export class GreenCertificateService {
  constructor(
    private greenCertificateRepository: GreenCertificateRepository,
    private greenCertificateHelper: GreenCertificateHelper,
  ) {}

  async create(
    dto: GreenCertificateRequestDto,
  ): Promise<GreenCertificateResponseDto> {
    return this.greenCertificateRepository.createGreenCertificate(dto);
  }

  async update(
    id: number,
    dto: GreenCertificateRequestDto,
  ): Promise<GreenCertificateResponseDto> {
    await this.greenCertificateHelper.checkGreenCertificate(id);
    return this.greenCertificateRepository.updateGreenCertificate(id, dto);
  }

  async getById(id: number): Promise<GreenCertificateResponseDto | null> {
    const cert =
      await this.greenCertificateRepository.getGreenCertificateById(id);
    if (!cert) {
      throw new NotFoundException('Chứng nhận xanh không tồn tại');
    }
    return cert;
  }

  async getAll(): Promise<GreenCertificateResponseDto[]> {
    const certs =
      await this.greenCertificateRepository.getAllGreenCertificates();
    return certs;
  }

  async delete(id: number): Promise<GreenCertificateResponseDto | null> {
    await this.greenCertificateHelper.checkGreenCertificate(id);
    return this.greenCertificateRepository.deleteGreenCertificate(id);
  }

  async deleteList(
    dto: DeleteListGreenCertificateDto,
  ): Promise<{ count: number }> {
    const result =
      await this.greenCertificateRepository.deleteListGreenCertificates(dto);
    if (result.count === 0) {
      throw new NotFoundException('Không tìm thấy chứng nhận xanh nào để xóa');
    }
    return result;
  }
}
