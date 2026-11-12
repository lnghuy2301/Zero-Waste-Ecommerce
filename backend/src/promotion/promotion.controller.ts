import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { PromotionRequestDto } from './dto/promotion.request.dto';
import { PromotionResponseDto } from './dto/promotion.response.dto';
import { DeleteListPromotionDto } from './dto/delete-list-promotion.dto';
import { JwtAuthGuard } from '../auth/auth.jwt.guard';
import { RolesGuard } from '../auth/auth.role.guard';
import { Roles } from '../auth/auth.role.decorator';
import { Role } from '@prisma/client';

@Controller('promotion')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  async create(
    @Body() dto: PromotionRequestDto,
  ): Promise<PromotionResponseDto> {
    return this.promotionService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PromotionRequestDto,
  ): Promise<PromotionResponseDto> {
    return this.promotionService.update(id, dto);
  }

  @Get(':id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PromotionResponseDto | null> {
    return this.promotionService.getById(id);
  }

  @Get()
  async getAll(): Promise<PromotionResponseDto[]> {
    return this.promotionService.getAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PromotionResponseDto | null> {
    return this.promotionService.delete(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete()
  async deleteList(
    @Body() dto: DeleteListPromotionDto,
  ): Promise<{ count: number }> {
    return this.promotionService.deleteList(dto);
  }
}
