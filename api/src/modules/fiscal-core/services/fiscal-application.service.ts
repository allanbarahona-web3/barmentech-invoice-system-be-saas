import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, FiscalDocumentStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TaxCalculationLineItem } from '../interfaces';
import { FiscalProviderResolver } from './fiscal-provider-resolver.service';

export interface PrepareOrderFiscalInput {
  tenantId: number;
  currency: string;
  subtotal: number;
  total: number;
  items: TaxCalculationLineItem[];
  commercialType?: string;
}

export interface PreparedOrderFiscalData {
  tenantId: number;
  countryCode: string | null;
  countryPack: string | null;
  documentType: string;
  fiscalNumber: string | null;
  taxTotal: number;
  payloadSnapshot: Prisma.InputJsonValue;
  providerResponse: Prisma.InputJsonValue;
  status: FiscalDocumentStatus;
}

export interface CreateFiscalDocumentForOrderInput {
  tenantId: number;
  orderId: string;
  sourceDocumentId?: string;
  commercialReference?: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  preparedData: PreparedOrderFiscalData;
}

@Injectable()
export class FiscalApplicationService {
  private readonly logger = new Logger(FiscalApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalProviderResolver: FiscalProviderResolver,
  ) {}

  private getDb(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx || this.prisma;
  }

  async prepareOrderFiscalData(
    input: PrepareOrderFiscalInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PreparedOrderFiscalData> {
    const db = this.getDb(tx);

    const tenant = await db.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${input.tenantId} not found`);
    }

    // TODO Phase 3: remove config.countryPack fallback once all tenants are migrated.
    const resolvedCountryPack =
      tenant.countryPack || ((tenant.config as Record<string, unknown> | null)?.countryPack as string | undefined);

    if (!tenant.countryPack && resolvedCountryPack) {
      this.logger.warn(
        `Tenant ${tenant.id} uses deprecated config.countryPack fallback. Migrate to tenant.countryPack.`,
      );
    }

    const provider = this.fiscalProviderResolver.resolveForCountryPack(resolvedCountryPack || 'default');
    const documentType = provider
      .getDocumentTypeMapper()
      .mapCommercialToFiscalDocumentType(input.commercialType || 'order');

    const taxCalculation = await provider.getTaxCalculator().calculate({
      tenantId: input.tenantId,
      currency: input.currency,
      subtotalAmount: input.subtotal,
      items: input.items,
    });

    const fiscalNumber = await provider.getDocumentNumberingStrategy().generateFiscalDocumentNumber({
      tenantId: input.tenantId,
      documentType,
      issuedAt: new Date(),
    });

    const generatedDocument = await provider.getFiscalDocumentGenerator().generate({
      tenantId: input.tenantId,
      countryCode: tenant.countryCode,
      documentType,
      orderId: 'pending-order-id',
      issuedAt: new Date(),
      payload: {
        currency: input.currency,
        subtotal: input.subtotal,
        taxTotal: taxCalculation.taxAmount,
        total: input.total,
      },
    });

    const submitResult = await provider.getTaxAuthorityGateway().submit({
      tenantId: input.tenantId,
      documentType,
      documentNumber: fiscalNumber || '',
      payload: generatedDocument.content,
    });

    return {
      tenantId: input.tenantId,
      countryCode: tenant.countryCode || null,
      countryPack: resolvedCountryPack || 'default',
      documentType,
      fiscalNumber,
      taxTotal: taxCalculation.taxAmount || 0,
      payloadSnapshot: {
        generatedDocument,
        taxBreakdown: taxCalculation.breakdown || [],
        itemCount: input.items.length,
      } as unknown as Prisma.InputJsonValue,
      providerResponse: submitResult as unknown as Prisma.InputJsonValue,
      status: this.mapSubmissionStatusToFiscalStatus(submitResult.status),
    };
  }

  async createFiscalDocumentForOrder(
    input: CreateFiscalDocumentForOrderInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.getDb(tx);

    return db.fiscalDocument.create({
      data: {
        tenantId: input.tenantId,
        orderId: input.orderId,
        sourceDocumentId: input.sourceDocumentId,
        documentType: input.preparedData.documentType,
        countryCode: input.preparedData.countryCode,
        countryPack: input.preparedData.countryPack,
        fiscalNumber: input.preparedData.fiscalNumber,
        commercialReference: input.commercialReference,
        status: input.preparedData.status,
        currency: input.currency,
        subtotal: input.subtotal,
        taxTotal: input.taxTotal,
        total: input.total,
        payloadSnapshot: input.preparedData.payloadSnapshot,
        providerResponse: input.preparedData.providerResponse,
        submittedAt:
          input.preparedData.status === 'SUBMITTED' || input.preparedData.status === 'PROCESSING'
            ? new Date()
            : null,
        acceptedAt: input.preparedData.status === 'ACCEPTED' ? new Date() : null,
        rejectedAt: input.preparedData.status === 'REJECTED' ? new Date() : null,
      },
    });
  }

  private mapSubmissionStatusToFiscalStatus(
    status: 'not_required' | 'queued' | 'accepted' | 'rejected' | 'error',
  ): FiscalDocumentStatus {
    if (status === 'queued') return 'SUBMITTED';
    if (status === 'accepted') return 'ACCEPTED';
    if (status === 'rejected') return 'REJECTED';
    if (status === 'error') return 'ERROR';
    return 'GENERATED';
  }
}
