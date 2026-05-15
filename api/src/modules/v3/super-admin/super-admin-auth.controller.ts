import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { SuperAdminRefreshDto } from './dto/super-admin-refresh.dto';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminJwtGuard } from './super-admin-jwt.guard';

@Controller('v1/platform/auth')
export class SuperAdminAuthController {
  constructor(private readonly superAdminAuthService: SuperAdminAuthService) {}

  @Post('login')
  login(@Body() dto: SuperAdminLoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.superAdminAuthService.login(
      dto.email,
      dto.password,
      ip,
      userAgent,
    );
  }

  @Post('refresh')
  refresh(@Body() dto: SuperAdminRefreshDto) {
    return this.superAdminAuthService.refreshAccessToken(dto.refreshToken);
  }

  @UseGuards(SuperAdminJwtGuard)
  @Post('logout')
  logout(@Req() req: Request & { user?: { userId: string; role: string } }) {
    const refreshToken = String((req.body as { refreshToken?: string })?.refreshToken || '');
    if (!refreshToken) {
      throw new ForbiddenException('refreshToken is required');
    }

    return this.superAdminAuthService.logout(req.user!.userId, refreshToken);
  }

  @UseGuards(SuperAdminJwtGuard)
  @Post('revoke-all')
  revokeAll(@Req() req: Request & { user?: { userId: string } }) {
    return this.superAdminAuthService.revokeAllSessions(req.user!.userId);
  }

  @UseGuards(SuperAdminJwtGuard)
  @Post('me')
  me(@Req() req: Request & { user?: { userId: string } }) {
    return this.superAdminAuthService.getProfile(req.user!.userId);
  }
}
