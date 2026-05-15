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
import { FeCustomerCompat } from '../contracts/fe-compatibility.contract';
import { CustomersV1Service } from './customers-v1.service';

@Controller('v1/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersV1Controller {
  constructor(private readonly customersV1Service: CustomersV1Service) {}

  @Get()
  @Roles('owner', 'manager', 'staff', 'admin')
  list(@CurrentTenant() tenantId?: number): Promise<FeCustomerCompat[]> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.customersV1Service.list(tenantId);
  }

  @Get(':id')
  @Roles('owner', 'manager', 'staff', 'admin')
  getById(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeCustomerCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.customersV1Service.getById(tenantId, id);
  }

  @Post()
  @Roles('owner', 'manager', 'admin')
  create(
    @Body() input: Partial<FeCustomerCompat>,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeCustomerCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.customersV1Service.create(tenantId, input);
  }

  @Patch(':id')
  @Roles('owner', 'manager', 'admin')
  update(
    @Param('id') id: string,
    @Body() input: Partial<FeCustomerCompat>,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeCustomerCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.customersV1Service.update(tenantId, id, input);
  }

  @Delete(':id')
  @Roles('owner', 'manager', 'admin')
  async remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<{ success: true }> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    await this.customersV1Service.remove(tenantId, id);
    return { success: true };
  }
}
