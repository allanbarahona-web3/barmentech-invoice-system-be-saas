import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { V3DbService } from '../v3-db.service';

export interface CompanyProfileV1Compat {
  [key: string]: unknown;
}

@Injectable()
export class CompanyProfileV1Service {
  constructor(private readonly v3DbService: V3DbService) {}

  async get(tenantId: number): Promise<CompanyProfileV1Compat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          branding_json AS branding,
          legal_json AS legal,
          fiscal_base_json AS "fiscalBase",
          fiscal_extensions_json AS "fiscalExtensions",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM company_profiles
        WHERE tenant_id = current_setting('app.tenant_id', true)::int
        LIMIT 1
      `);

      if (!rows[0]) throw new NotFoundException('Company profile not found for tenant');
      return rows[0] as CompanyProfileV1Compat;
    });
  }

  async save(
    tenantId: number,
    input: CompanyProfileV1Compat,
  ): Promise<CompanyProfileV1Compat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        UPDATE company_profiles
        SET
          branding_json = ${input.branding ?? null},
          legal_json = ${input.legal ?? null},
          fiscal_base_json = ${input.fiscalBase ?? null},
          fiscal_extensions_json = ${input.fiscalExtensions ?? null},
          updated_at = now()
        WHERE tenant_id = current_setting('app.tenant_id', true)::int
        RETURNING
          branding_json AS branding,
          legal_json AS legal,
          fiscal_base_json AS "fiscalBase",
          fiscal_extensions_json AS "fiscalExtensions",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      if (!rows[0]) throw new NotFoundException('Company profile not found for tenant');
      return rows[0] as CompanyProfileV1Compat;
    });
  }

  async update(
    tenantId: number,
    input: CompanyProfileV1Compat,
  ): Promise<CompanyProfileV1Compat> {
    const current = await this.get(tenantId);
    return this.save(tenantId, {
      ...current,
      ...input,
      branding: {
        ...(typeof current.branding === 'object' && current.branding ? current.branding : {}),
        ...(typeof input.branding === 'object' && input.branding ? input.branding : {}),
      },
      legal: {
        ...(typeof current.legal === 'object' && current.legal ? current.legal : {}),
        ...(typeof input.legal === 'object' && input.legal ? input.legal : {}),
      },
      fiscalBase: {
        ...(typeof current.fiscalBase === 'object' && current.fiscalBase ? current.fiscalBase : {}),
        ...(typeof input.fiscalBase === 'object' && input.fiscalBase ? input.fiscalBase : {}),
      },
      fiscalExtensions: {
        ...(typeof current.fiscalExtensions === 'object' && current.fiscalExtensions ? current.fiscalExtensions : {}),
        ...(typeof input.fiscalExtensions === 'object' && input.fiscalExtensions ? input.fiscalExtensions : {}),
      },
    });
  }
}
