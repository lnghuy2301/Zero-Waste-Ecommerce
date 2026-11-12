import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountRequestDto } from './dto/account.request.dto';
import { AccountResponseDto } from './dto/account.response.dto';
import { Account_profileResponseDto } from './dto/account_profile.response.dto';
import { List_accountRequestDto } from './dto/list_account.request.dto';
import { UpdateActiveRequestDto } from './dto/update_active.request.dto';
import { UpdateRoleRequesrDto } from './dto/update_role.request.dto';
import { plainToInstance } from 'class-transformer';
import { Role } from '@prisma/client';
import { removeUpload } from '../media/config/remove-upload';

@Injectable()
export class AccountRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async createAccount(
    account: AccountRequestDto,
  ): Promise<Account_profileResponseDto> {
    const newAccount = await this.prismaService.account.create({
      data: {
        email: account.email,
        password: account.password,
        role: Role.CUSTOMER,
        isActive: account.isActive ?? true,
        profile: {
          create: {
            fullName: account.profile.fullName,
            phone: account.profile.phone,
            address: account.profile.address,
            gender: account.profile.gender,
            dob: account.profile.dob,
          },
        },
      },
      include: { profile: true },
    });
    return plainToInstance(Account_profileResponseDto, newAccount);
  }

  async updatePassword(
    id: number,
    hashPassword: string,
  ): Promise<AccountResponseDto> {
    const updated = await this.prismaService.account.update({
      where: {
        id: id,
      },
      data: {
        password: hashPassword,
      },
    });
    return plainToInstance(AccountResponseDto, updated);
  }

  async updateActive(
    id: number,
    account: UpdateActiveRequestDto,
  ): Promise<AccountResponseDto> {
    const updated = await this.prismaService.account.update({
      where: {
        id: id,
      },
      data: {
        isActive: account.isActive,
      },
    });
    return plainToInstance(AccountResponseDto, updated);
  }

  async updateRole(
    id: number,
    account: UpdateRoleRequesrDto,
  ): Promise<AccountResponseDto> {
    const updated = await this.prismaService.account.update({
      where: {
        id: id,
      },
      data: {
        role: account.role,
      },
    });
    return plainToInstance(AccountResponseDto, updated);
  }

  async statsAccount() {
    return this.prismaService.account.count({
      where: {
        role: {
          not: 'ADMIN',
        },
      },
    });
  }

  async getAccountById(id: number): Promise<AccountResponseDto | null> {
    const account = await this.prismaService.account.findUnique({
      where: {
        id: id,
      },
    });
    return account
      ? plainToInstance(Account_profileResponseDto, account)
      : null;
  }

  async getAllAccount(): Promise<AccountResponseDto[]> {
    const accounts = await this.prismaService.account.findMany({
      where: {
        role: {
          not: 'ADMIN',
        },
      },
    });
    return accounts.map((a) => plainToInstance(AccountResponseDto, a));
  }

  async deleteAccountById(id: number) {
    return this.prismaService.$transaction(async (tx) => {
      const account = await this.getAccountById(id);
      if (!account) return null;
      if (account.role === Role.ADMIN)
        throw new BadRequestException(
          'Không xóa tài khoản quản trị bằng thao tác này',
        );
      await tx.customerProfile.deleteMany({
        where: {
          accountId: account.id,
        },
      });

      await tx.account.delete({
        where: {
          id: id,
        },
      });

      return account;
    });
  }

  async deleteListAccount(listAccount: List_accountRequestDto) {
    return this.prismaService.$transaction(async (tx) => {
      const accounts = await tx.account.findMany({
        where: {
          id: {
            in: listAccount.Ids,
          },
          role: {
            not: 'ADMIN',
          },
        },
        select: { id: true },
      });

      if (accounts.length === 0) return null;
      const customerIds = accounts.map((account) => account.id);

      await tx.customerProfile.deleteMany({
        where: {
          accountId: {
            in: customerIds,
          },
        },
      });

      await tx.account.deleteMany({
        where: {
          id: {
            in: customerIds,
          },
        },
      });

      return { count: accounts.length };
    });
  }

  async uploadAvatar(
    id: number,
    file: Express.Multer.File,
  ): Promise<Account_profileResponseDto> {
    const previous = await this.prismaService.account.findUnique({
      where: { id },
      select: { avatar: true },
    });
    const updated = await this.prismaService.account.update({
      where: { id },
      data: {
        avatar: `/uploads/${file.filename}`,
      },
      include: { profile: true },
    });
    await removeUpload(previous?.avatar);
    return plainToInstance(Account_profileResponseDto, updated);
  }
  async getTopCustomers() {
    // 1. Lấy danh sách khách hàng và dùng select để Prisma tự nội suy đúng kiểu dữ liệu
    const customers = await this.prismaService.account.findMany({
      where: {
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        avatar: true,
        profile: {
          select: {
            fullName: true,
            phone: true,
          },
        },
        orders: {
          select: {
            totalAmount: true, // Sửa thành totalAmount chuẩn theo schema
          },
        },
      },
    });

    // 2. Tính toán tổng số đơn và tổng tiền chi trả
    const topCustomers = customers.map((customer) => {
      // Đảm bảo orders luôn là mảng để tránh lỗi reduce
      const customerOrders = customer.orders || [];
      const totalOrders = customerOrders.length;

      // Chuyển kiểu Decimal của Prisma sang Number trong JavaScript
      const totalSpent = customerOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0,
      );

      return {
        id: customer.id,
        email: customer.email,
        // profile là quan hệ 1-1 nên truy cập trực tiếp, không dùng [0]
        fullName: customer.profile?.fullName || 'Chưa cập nhật',
        phone: customer.profile?.phone || 'Chưa cập nhật',
        avatar: customer.avatar,
        isActive: customer.isActive,
        totalOrders,
        totalSpent,
      };
    });

    // 3. Sắp xếp: Tổng tiền giảm dần -> Số lượng đơn hàng giảm dần
    return topCustomers.sort((a, b) => {
      if (b.totalSpent !== a.totalSpent) {
        return b.totalSpent - a.totalSpent;
      }
      return b.totalOrders - a.totalOrders;
    });
  }
}
