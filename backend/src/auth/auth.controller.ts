import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthLocalGuard } from './auth.local.guard';
import { AccountRequestDto } from '../account/dto/account.request.dto';
import { AccountResponseDto } from '../account/dto/account.response.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './google.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @UseGuards(AuthLocalGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(
    @Body() account: AccountRequestDto,
  ): Promise<AccountResponseDto> {
    return this.authService.register(account);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Request() req) {
    // Guard tự động chuyển hướng sang trang đăng nhập của Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req, @Res() res) {
    const result = await this.authService.validateGoogleUser(req.user);
    const params = new URLSearchParams({
      token: result.token,
      id: String(result.user.id),
      email: result.user.email,
      role: result.user.role,
    });
    const frontendUrl = `${this.config.get('FRONTEND_URL') || 'http://localhost:5173'}/login#${params}`;
    return res.redirect(frontendUrl);
  }
}
