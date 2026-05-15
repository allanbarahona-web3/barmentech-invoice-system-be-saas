import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ReceiptAllocationV1Compat,
  ReceiptV1Compat,
  ReceiptsV1Service,
} from './receipts-v1.service';

@Controller('v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReceiptsV1Controller {
  constructor(private readonly receiptsV1Service: ReceiptsV1Service) {}

  @Post('receipts')
  @Roles('owner', 'manager', 'admin')
  createReceipt(
    @Body() input: ReceiptV1Compat,
    @CurrentTenant() tenantId?: number,
  ): Promise<ReceiptV1Compat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.receiptsV1Service.createReceipt(tenantId, input);
  }

  @Post('receipts/:id/allocations')
  @Roles('owner', 'manager', 'admin')
  allocate(
    @Param('id') id: string,
    @Body() input: ReceiptAllocationV1Compat,
    @CurrentTenant() tenantId?: number,
  ): Promise<{ success: true }> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.receiptsV1Service.allocate(tenantId, id, input);
  }

  @Get('documents/:id/receipts')
  @Roles('owner', 'manager', 'staff', 'admin')
  listByDocument(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<ReceiptV1Compat[]> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.receiptsV1Service.listByDocument(tenantId, id);
  }
}
