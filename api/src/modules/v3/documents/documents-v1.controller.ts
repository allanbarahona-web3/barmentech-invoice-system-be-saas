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
import {
  FeInvoiceCompat,
  FeInvoiceCreateInputCompat,
} from '../contracts/fe-compatibility.contract';
import { DocumentsV1Service } from './documents-v1.service';

@Controller('v1/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsV1Controller {
  constructor(private readonly documentsV1Service: DocumentsV1Service) {}

  @Get()
  @Roles('owner', 'manager', 'staff', 'admin')
  list(@CurrentTenant() tenantId?: number): Promise<FeInvoiceCompat[]> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.list(tenantId);
  }

  @Get(':id')
  @Roles('owner', 'manager', 'staff', 'admin')
  getById(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeInvoiceCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.getById(tenantId, id);
  }

  @Post()
  @Roles('owner', 'manager', 'admin')
  create(
    @Body() input: FeInvoiceCreateInputCompat,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeInvoiceCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.create(tenantId, input);
  }

  @Patch(':id')
  @Roles('owner', 'manager', 'admin')
  update(
    @Param('id') id: string,
    @Body() input: FeInvoiceCreateInputCompat,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeInvoiceCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.update(tenantId, id, input);
  }

  @Delete(':id')
  @Roles('owner', 'manager', 'admin')
  async remove(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<{ success: true }> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    await this.documentsV1Service.remove(tenantId, id);
    return { success: true };
  }

  @Patch(':id/status')
  @Roles('owner', 'manager', 'admin')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentTenant() tenantId?: number,
  ): Promise<FeInvoiceCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.updateStatus(tenantId, id, body.status);
  }

  @Post(':id/export-pdf')
  @Roles('owner', 'manager', 'staff', 'admin')
  recordExportPdf(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeInvoiceCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.recordExportPdf(tenantId, id);
  }

  @Post(':id/sent')
  @Roles('owner', 'manager', 'staff', 'admin')
  recordSent(
    @Param('id') id: string,
    @Body() body: { toEmail?: string; message?: string },
    @CurrentTenant() tenantId?: number,
  ): Promise<FeInvoiceCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.recordSent(
      tenantId,
      id,
      body.toEmail,
      body.message,
    );
  }

  @Post(':id/archive')
  @Roles('owner', 'manager', 'admin')
  archive(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeInvoiceCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.archive(tenantId, id);
  }

  @Post(':id/convert-to-invoice')
  @Roles('owner', 'manager', 'admin')
  convertQuoteToInvoice(
    @Param('id') id: string,
    @CurrentTenant() tenantId?: number,
  ): Promise<FeInvoiceCompat> {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');
    return this.documentsV1Service.convertQuoteToInvoice(tenantId, id);
  }
}
