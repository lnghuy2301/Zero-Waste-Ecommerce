import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { AccountResponseDto } from './dto/account.response.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountHelper {
  constructor(private prismaService: PrismaService) {}

  async check_account(id: number): Promise<AccountResponseDto> {
    const account = await this.prismaService.account.findUnique({
      where: { id: id },
    });
    if (!account) {
      throw new InternalServerErrorException('Tài khoản không tồn tại');
    }
    return account;
  }

  async checkActive(id: number) {
    const account = await this.check_account(id);
    if (!account.isActive) {
      throw new BadRequestException('Tài khoản của bạn đã bị khóa');
    }
    return account;
  }

  // SỬA TẠI ĐÂY: Cho phép Admin thao tác thoải mái
  async checkAdmin(id: number) {
    const account = await this.check_account(id);
    if (account.role !== 'ADMIN')
      throw new ForbiddenException('Bạn không có quyền quản trị');
    // Bỏ đoạn "if (account.role === 'ADMIN') throw ..."
    // Bây giờ Admin có thể xem/sửa Admin khác mà không bị chặn lỗi 400 nữa.
    return account;
  }

  async checkSelfOrAdmin(tokenId: number, id: number, currentUserRole: string) {
    // Admin luôn có quyền, hoặc người dùng tự sửa chính mình
    if (currentUserRole === 'ADMIN' || tokenId === id) {
      return;
    }
    throw new ForbiddenException(
      'Bạn không có quyền thực hiện hành động này trên tài khoản của người khác',
    );
  }
}
