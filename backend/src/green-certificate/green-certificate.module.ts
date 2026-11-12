import { Module } from '@nestjs/common';
import { GreenCertificateController } from './green-certificate.controller';
import { GreenCertificateService } from './green-certificate.service';
import { GreenCertificateRepository } from './green-certificate.repository';
import { GreenCertificateHelper } from './green-certificate.helper';
import { AccountHelper } from '../account/account.helper';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [AccountModule],
  controllers: [GreenCertificateController],
  providers: [
    GreenCertificateService,
    GreenCertificateRepository,
    GreenCertificateHelper,
    AccountHelper,
  ],
  exports: [
    GreenCertificateService,
    GreenCertificateRepository,
    GreenCertificateHelper,
  ],
})
export class GreenCertificateModule {}
