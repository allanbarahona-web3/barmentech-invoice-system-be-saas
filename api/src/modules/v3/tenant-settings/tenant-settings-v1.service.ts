import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { V3DbService } from '../v3-db.service';

export interface TenantSettingsV1Compat {
  [key: string]: unknown;
}

@Injectable()
export class TenantSettingsV1Service {
  constructor(private readonly v3DbService: V3DbService) {}

  async get(tenantId: number): Promise<TenantSettingsV1Compat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          currency,
          tax_enabled AS "taxEnabled",
          tax_config_json AS "taxConfig",
          invoice_prefix AS "invoicePrefix",
          next_invoice_number AS "nextInvoiceNumber",
          draft_prefix AS "draftPrefix",
          next_draft_number AS "nextDraftNumber",
          quote_prefix AS "quotePrefix",
          next_quote_number AS "nextQuoteNumber",
          accepted_payment_methods_json AS "acceptedPaymentMethods",
          features_json AS features,
          onboarding_completed AS "onboardingCompleted",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM tenant_settings
        WHERE tenant_id = current_setting('app.tenant_id', true)::int
        LIMIT 1
      `);

      if (!rows[0]) {
        throw new NotFoundException('Tenant settings not found for tenant');
      }

      return rows[0] as TenantSettingsV1Compat;
    });
  }

  async save(
    tenantId: number,
    input: TenantSettingsV1Compat,
  ): Promise<TenantSettingsV1Compat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const current = await this.get(tenantId);

      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        UPDATE tenant_settings
        SET
          currency = ${String(input.currency ?? current.currency ?? 'USD')},
          tax_enabled = ${Boolean(input.taxEnabled ?? current.taxEnabled ?? true)},
          tax_config_json = ${input.taxConfig ?? current.taxConfig ?? null},
          invoice_prefix = ${String(input.invoicePrefix ?? current.invoicePrefix ?? 'INV-')},
          next_invoice_number = ${Number(input.nextInvoiceNumber ?? current.nextInvoiceNumber ?? 1)},
          draft_prefix = ${String(input.draftPrefix ?? current.draftPrefix ?? 'DRF-')},
          next_draft_number = ${Number(input.nextDraftNumber ?? current.nextDraftNumber ?? 1)},
          quote_prefix = ${String(input.quotePrefix ?? current.quotePrefix ?? 'COT-')},
          next_quote_number = ${Number(input.nextQuoteNumber ?? current.nextQuoteNumber ?? 1)},
          accepted_payment_methods_json = ${input.acceptedPaymentMethods ?? current.acceptedPaymentMethods ?? null},
          features_json = ${input.features ?? current.features ?? null},
          onboarding_completed = ${Boolean(input.onboardingCompleted ?? current.onboardingCompleted ?? false)},
          updated_at = now()
        WHERE tenant_id = current_setting('app.tenant_id', true)::int
        RETURNING
          currency,
          tax_enabled AS "taxEnabled",
          tax_config_json AS "taxConfig",
          invoice_prefix AS "invoicePrefix",
          next_invoice_number AS "nextInvoiceNumber",
          draft_prefix AS "draftPrefix",
          next_draft_number AS "nextDraftNumber",
          quote_prefix AS "quotePrefix",
          next_quote_number AS "nextQuoteNumber",
          accepted_payment_methods_json AS "acceptedPaymentMethods",
          features_json AS features,
          onboarding_completed AS "onboardingCompleted",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      return rows[0] as TenantSettingsV1Compat;
    });
  }

  async completeOnboarding(tenantId: number): Promise<{ success: true }> {
    await this.v3DbService.withTenant(tenantId, async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE tenant_settings
        SET onboarding_completed = true, updated_at = now()
        WHERE tenant_id = current_setting('app.tenant_id', true)::int
      `);
    });

    return { success: true };
  }
}
