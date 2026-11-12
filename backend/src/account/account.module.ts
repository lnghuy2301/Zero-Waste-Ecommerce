import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AccountRepository } from './account.repository';
import { AccountHelper } from './account.helper';

@Module({
  controllers: [AccountController],
  providers: [AccountService, AccountRepository, AccountHelper],
  exports: [AccountService, AccountRepository, AccountHelper],
})
export class AccountModule {}
