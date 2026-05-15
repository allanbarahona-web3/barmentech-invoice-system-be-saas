import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FeProductCompat } from '../contracts/fe-compatibility.contract';
import { CatalogItemsV1Service } from './catalog-items-v1.service';

@Controller('v1/catalog-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogItemsV1Controller {
  constructor(private readonly catalogItemsV1Service: CatalogItemsV1Service) {}

  @Get()
  @Roles('owner', 'manager', 'staff', 'admin')
  list(@CurrentTenant() tenantId?: number): Promise<FeProductCompat[]> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.catalogItemsV1Service.list(tenantId);
  }

  @Get(':id')
  @Roles('owner', 'manager', 'staff', 'admin')
  getById(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeProductCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.catalogItemsV1Service.getById(tenantId, id);
  }

  @Post()
  @Roles('owner', 'manager', 'admin')
  create(
    @Body() input: Partial<FeProductCompat>,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeProductCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.catalogItemsV1Service.create(tenantId, input);
  }

  @Patch(':id')
  @Roles('owner', 'manager', 'admin')
  update(
    @Param('id') id: string,
    @Body() input: Partial<FeProductCompat>,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeProductCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.catalogItemsV1Service.update(tenantId, id, input);
  }

  @Delete(':id')
  @Roles('owner', 'manager', 'admin')
  async remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<{ success: true }> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    await this.catalogItemsV1Service.remove(tenantId, id);
    return { success: true };
  }
}
