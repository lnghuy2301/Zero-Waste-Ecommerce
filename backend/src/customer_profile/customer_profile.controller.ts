import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { CustomerProfileRequestDto } from './dto/customer_profile.request.dto';
import { CustomerProfileResponseDto } from './dto/customer_profile.response.dto';
import { CustomerProfileService } from './customer_profile.service';
import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role } from '@prisma/client';

@Controller('customer_profile')
export class CustomerProfileController {
  constructor(private customerProfileService: CustomerProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Put(':id/profile/:idAccount')
  async updateCustomerProfile(
    @Param('id', ParseIntPipe) id: number,
    @Param('idAccount', ParseIntPipe) idAccount: number,
    @Body() customerProfileRequestDto: CustomerProfileRequestDto,
    @Req() req: any,
  ): Promise<CustomerProfileResponseDto> {
    if (req.user.id !== idAccount && req.user.role !== Role.ADMIN)
      throw new ForbiddenException();
    return await this.customerProfileService.updateCustomerProfile(
      id,
      idAccount,
      customerProfileRequestDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':accountId/profile')
  async getCustomerProfileById(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Req() req: any,
  ): Promise<CustomerProfileResponseDto | null> {
    if (req.user.id !== accountId && req.user.role !== Role.ADMIN)
      throw new ForbiddenException();
    return await this.customerProfileService.getCustomerProfileById(accountId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async getAllCustomerProfiles(): Promise<CustomerProfileResponseDto[]> {
    return await this.customerProfileService.getAllCustomerProfile();
  }
}
