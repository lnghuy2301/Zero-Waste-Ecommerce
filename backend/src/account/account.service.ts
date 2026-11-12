import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountRepository } from './account.repository';
import { AccountRequestDto } from './dto/account.request.dto';
import { AccountResponseDto } from './dto/account.response.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ResetPasswordRequestDto } from './dto/reset_password.request.dto';
import { UpdateActiveRequestDto } from './dto/update_active.request.dto';
import { UpdateRoleRequesrDto } from './dto/update_role.request.dto';
import { List_accountRequestDto } from './dto/list_account.request.dto';
import { AccountHelper } from './account.helper';
import { plainToInstance } from 'class-transformer';
import { Express } from 'express'; // Thêm dòng này

@Injectable()
export class AccountService {
  constructor(
    private accountRepository: AccountRepository,
    private prismaService: PrismaService,
    private accountHelper: AccountHelper,
  ) {}

  async createAccount(account: AccountRequestDto): Promise<AccountResponseDto> {
    const check_email = await this.prismaService.account.findUnique({
      where: { email: account.email },
    });
    if (check_email) {
      throw new UnauthorizedException('Email đã tồn tại');
    }

    const saltRounds = 10;
    const hash_password = await bcrypt.hash(account.password, saltRounds);
    const created = await this.accountRepository.createAccount({
      ...account,
      password: hash_password,
    });
    return plainToInstance(AccountResponseDto, created);
  }

  // === HÀM XỬ LÝ UPLOAD AVATAR ===
  async uploadAvatar(id: number, file: Express.Multer.File, currentUser: any) {
    await this.accountHelper.checkSelfOrAdmin(
      currentUser.id,
      id,
      currentUser.role,
    );
    return this.accountRepository.uploadAvatar(id, file);
  }
  // ===============================

  async resetPassword(
    id: number,
    resetPassword: ResetPasswordRequestDto,
    currentUser: any,
  ) {
    await this.accountHelper.checkSelfOrAdmin(
      currentUser.id,
      id,
      currentUser.role,
    );

    const account = await this.accountHelper.check_account(id);
    const check_password = await bcrypt.compare(
      resetPassword.old_password,
      account.password,
    );
    if (!check_password) {
      throw new BadRequestException('Mật khẩu cũ sai');
    }

    if (resetPassword.new_password !== resetPassword.confirm_password) {
      throw new BadRequestException('Mật khẩu không trùng khớp');
    }
    const hash_password = await bcrypt.hash(resetPassword.confirm_password, 10);
    return this.accountRepository.updatePassword(id, hash_password);
  }

  async updateActive(
    id: number,
    updateisActive: UpdateActiveRequestDto,
  ): Promise<AccountResponseDto> {
    await this.accountHelper.check_account(id);
    return this.accountRepository.updateActive(id, updateisActive);
  }

  async updateRole(
    id: number,
    updateRole: UpdateRoleRequesrDto,
  ): Promise<AccountResponseDto> {
    await this.accountHelper.check_account(id);
    return this.accountRepository.updateRole(id, updateRole);
  }

  async statsAccount() {
    const result = await this.accountRepository.statsAccount();
    if (result === 0) {
      throw new BadRequestException('Không có tài khoản nào');
    }
    return result;
  }

  async getAccountById(
    id: number,
    currentUser: any,
  ): Promise<AccountResponseDto | null> {
    await this.accountHelper.checkSelfOrAdmin(
      currentUser.id,
      id,
      currentUser.role,
    );

    const account = await this.accountRepository.getAccountById(id);
    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }
    return account;
  }

  async getAllAccounts(currentUser: any): Promise<AccountResponseDto[]> {
    await this.accountHelper.checkAdmin(currentUser.id);
    const account = await this.accountRepository.getAllAccount();
    if (account.length == 0) {
      throw new BadRequestException('Không có tài khoản nào tồn tại');
    }
    return account;
  }

  async deleteAccountById(
    id: number,
    currentUser: any,
  ): Promise<AccountResponseDto | null> {
    await this.accountHelper.check_account(id);
    await this.accountHelper.checkSelfOrAdmin(
      currentUser.id,
      id,
      currentUser.role,
    );
    return this.accountRepository.deleteAccountById(id);
  }

  async deleteListAccount(listAccount: List_accountRequestDto) {
    const account = await this.accountRepository.deleteListAccount(listAccount);
    if (!account) {
      throw new NotFoundException(
        'Không tìm thấy tài khoản nào hợp lệ để xóa hoặc danh sách chứa Admin',
      );
    }
    return account;
  }

  // 1. HÀM QUÊN MẬT KHẨU (Gửi mail)
  async forgotPassword(email: string) {
    const message = 'Nếu email tồn tại, link khôi phục đã được gửi!';
    if (!process.env.SMTP_HOST) return { message };
    const account = await this.prismaService.account.findUnique({
      where: { email },
    });
    if (!account?.isActive) return { message };
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    await this.prismaService.account.update({
      where: { email },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 1025),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
      connectionTimeout: 5000,
      socketTimeout: 10000,
    });
    const url = new URL(
      '/reset-password',
      process.env.FRONTEND_URL || 'http://localhost:5173',
    );
    url.search = new URLSearchParams({ token, email }).toString();
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'EcoStore Demo <demo@example.com>',
        to: email,
        subject: 'Khôi phục mật khẩu EcoStore',
        text: 'Đặt lại mật khẩu trong 15 phút: ' + url.toString(),
      });
    } catch {
      // Same response for unknown accounts and delivery failures; no token in logs.
      console.warn(
        'Password recovery email could not be delivered. Check SMTP settings.',
      );
    }
    return { message };
  }

  async resetPasswordWithToken(body: {
    email: string;
    token: string;
    newPassword: string;
  }) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(body.token)
      .digest('hex');
    const password = await bcrypt.hash(body.newPassword, 10);
    // Consume token atomically: two simultaneous requests cannot both reuse it.
    const result = await this.prismaService.account.updateMany({
      where: {
        email: body.email,
        isActive: true,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
      data: { password, resetPasswordToken: null, resetPasswordExpires: null },
    });
    if (result.count !== 1)
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    return { message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập.' };
  }

  async getTopCustomers(currentUser: any) {
    // Chỉ Admin mới được xem thống kê này
    await this.accountHelper.checkAdmin(currentUser.id);

    const topCustomers = await this.accountRepository.getTopCustomers();

    // (Tuỳ chọn) Lọc ra những khách hàng đã có ít nhất 1 đơn hàng để bảng thống kê gọn hơn
    // const filtered = topCustomers.filter(c => c.totalOrders > 0);

    if (!topCustomers || topCustomers.length === 0) {
      throw new NotFoundException('Chưa có dữ liệu khách hàng để thống kê');
    }

    return topCustomers;
  }
}
