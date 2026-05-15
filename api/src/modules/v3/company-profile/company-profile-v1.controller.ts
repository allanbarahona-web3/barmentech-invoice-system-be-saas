import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CompanyProfileV1Compat,
  CompanyProfileV1Service,
} from './company-profile-v1.service';

@Controller('v1/company-profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyProfileV1Controller {
  constructor(private readonly companyProfileV1Service: CompanyProfileV1Service) {}

  @Get()
  @Roles('owner', 'manager', 'staff', 'admin')
  get(@CurrentTenant() tenantId?: number): Promise<CompanyProfileV1Compat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.companyProfileV1Service.get(tenantId);
  }

  @Put()
  @Roles('owner', 'manager', 'admin')
  save(
    @Body() input: CompanyProfileV1Compat,
    @CurrentTenant() tenantId?: number,
  ): Promise<CompanyProfileV1Compat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.companyProfileV1Service.save(tenantId, input);
  }

  @Patch()
  @Roles('owner', 'manager', 'admin')
  update(
    @Body() input: CompanyProfileV1Compat,
    @CurrentTenant() tenantId?: number,
  ): Promise<CompanyProfileV1Compat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.companyProfileV1Service.update(tenantId, input);
  }
}
