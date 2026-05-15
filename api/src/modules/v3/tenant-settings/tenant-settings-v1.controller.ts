import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  TenantSettingsV1Compat,
  TenantSettingsV1Service,
} from './tenant-settings-v1.service';

@Controller('v1/tenant-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantSettingsV1Controller {
  constructor(private readonly tenantSettingsV1Service: TenantSettingsV1Service) {}

  @Get()
  @Roles('owner', 'manager', 'staff', 'admin')
  get(@CurrentTenant() tenantId?: number): Promise<TenantSettingsV1Compat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.tenantSettingsV1Service.get(tenantId);
  }

  @Put()
  @Roles('owner', 'manager', 'admin')
  save(
    @Body() input: TenantSettingsV1Compat,
    @CurrentTenant() tenantId?: number,
  ): Promise<TenantSettingsV1Compat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.tenantSettingsV1Service.save(tenantId, input);
  }

  @Post('complete-onboarding')
  @Roles('owner', 'manager', 'admin')
  completeOnboarding(
    @CurrentTenant() tenantId?: number,
  ): Promise<{ success: true }> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.tenantSettingsV1Service.completeOnboarding(tenantId);
  }
}
