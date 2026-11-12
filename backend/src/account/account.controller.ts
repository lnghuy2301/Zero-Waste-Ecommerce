import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountRequestDto } from './dto/account.request.dto';
import { AccountResponseDto } from './dto/account.response.dto';
import { ResetPasswordRequestDto } from './dto/reset_password.request.dto';
import { UpdateActiveRequestDto } from './dto/update_active.request.dto';
import { UpdateRoleRequesrDto } from './dto/update_role.request.dto';
import { List_accountRequestDto } from './dto/list_account.request.dto';
import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../auth/get-user.decorator';
import {
  ForgotPasswordDto,
  PasswordRecoveryDto,
} from './dto/password-recovery.dto';

// Import thư viện upload file y chang Product
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter, multerStorage } from '../media/config/multer.config';
import { Express } from 'express';

@Controller('account')
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Post()
  async createAccount(
    @Body() account: AccountRequestDto,
  ): Promise<AccountResponseDto> {
    return this.accountService.createAccount(account);
  }

  // === API UPLOAD & CẬP NHẬT AVATAR ===
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Patch(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: multerStorage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() currentUser: any,
  ) {
    if (!file) throw new BadRequestException('Không có file ảnh được upload');
    return this.accountService.uploadAvatar(id, file, currentUser);
  }
  // ===================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Put(':id/password')
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPassword: ResetPasswordRequestDto,
    @GetUser() currentUser: any,
  ) {
    return this.accountService.resetPassword(id, resetPassword, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id/active')
  async updateActive(
    @Param('id', ParseIntPipe) id: number,
    @Body() account: UpdateActiveRequestDto,
  ): Promise<AccountResponseDto> {
    return this.accountService.updateActive(id, account);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id/role')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() account: UpdateRoleRequesrDto,
  ): Promise<AccountResponseDto> {
    return this.accountService.updateRole(id, account);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats/count')
  async statsAccount() {
    return this.accountService.statsAccount();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('stats/top-customers')
  async getTopCustomers(@GetUser() currentUser: any) {
    return this.accountService.getTopCustomers(currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Get(':id')
  async getAccount(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: any,
  ): Promise<AccountResponseDto | null> {
    return this.accountService.getAccountById(id, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async getAllAccounts(
    @GetUser() currentUser: any,
  ): Promise<AccountResponseDto[]> {
    return this.accountService.getAllAccounts(currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Delete(':id')
  async deleteAccountById(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() currentUser: any,
  ): Promise<AccountResponseDto | null> {
    return this.accountService.deleteAccountById(id, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete()
  async list_delete_account(@Body() listAccount: List_accountRequestDto) {
    return this.accountService.deleteListAccount(listAccount);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.accountService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: PasswordRecoveryDto) {
    return this.accountService.resetPasswordWithToken(body);
  }
}
