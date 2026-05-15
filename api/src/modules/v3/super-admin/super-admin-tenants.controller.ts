import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminJwtGuard } from './super-admin-jwt.guard';
import { SuperAdminTenantsService } from './super-admin-tenants.service';

@Controller('v1/platform/tenants')
@UseGuards(SuperAdminJwtGuard)
export class SuperAdminTenantsController {
  constructor(private readonly tenantsService: SuperAdminTenantsService) {}

  @Get()
  list(@Req() req: Request & { user?: { role: string } }) {
    this.assertPlatformRole(req.user?.role);
    return this.tenantsService.listTenants();
  }

  @Patch(':id/suspend')
  suspend(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: Request & { user?: { userId: string; role: string } },
  ) {
    this.assertPlatformRole(req.user?.role);
    return this.tenantsService.suspendTenant(Number(id), req.user!.userId, body.reason);
  }

  @Patch(':id/activate')
  activate(
    @Param('id') id: string,
    @Req() req: Request & { user?: { userId: string; role: string } },
  ) {
    this.assertPlatformRole(req.user?.role);
    return this.tenantsService.activateTenant(Number(id), req.user!.userId);
  }

  private assertPlatformRole(role?: string) {
    if (role !== 'super_admin' && role !== 'platform_admin') {
      throw new ForbiddenException('Insufficient permissions');
    }
  }
}
