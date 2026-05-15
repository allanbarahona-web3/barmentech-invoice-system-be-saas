import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ExpenseV1Compat, ExpensesV1Service } from './expenses-v1.service';

@Controller('v1/expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesV1Controller {
  constructor(private readonly expensesV1Service: ExpensesV1Service) {}

  @Get()
  @Roles('owner', 'manager', 'staff', 'admin')
  list(@CurrentTenant() tenantId?: number): Promise<ExpenseV1Compat[]> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.expensesV1Service.list(tenantId);
  }

  @Post('manual')
  @Roles('owner', 'manager', 'admin')
  createManual(
    @Body() input: ExpenseV1Compat,
    @CurrentTenant() tenantId?: number,
  ): Promise<ExpenseV1Compat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.expensesV1Service.createManual(tenantId, input);
  }

  @Post('import-xml')
  @Roles('owner', 'manager', 'admin')
  importXml(
    @Body() input: ExpenseV1Compat,
    @CurrentTenant() tenantId?: number,
  ): Promise<ExpenseV1Compat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.expensesV1Service.importXml(tenantId, input);
  }
}
