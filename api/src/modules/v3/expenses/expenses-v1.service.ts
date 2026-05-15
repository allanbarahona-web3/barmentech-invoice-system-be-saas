import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { V3DbService } from '../v3-db.service';

export interface ExpenseV1Compat {
  [key: string]: unknown;
}

@Injectable()
export class ExpensesV1Service {
  constructor(private readonly v3DbService: V3DbService) {}

  async list(tenantId: number): Promise<ExpenseV1Compat[]> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          id,
          supplier_name AS "supplierName",
          supplier_tax_id AS "supplierTaxId",
          document_type AS "documentType",
          document_number AS "documentNumber",
          issue_date AS "issueDate",
          currency,
          subtotal,
          tax_total AS "taxTotal",
          total,
          deductible_tax_total AS "deductibleTaxTotal",
          status::text AS status,
          source::text AS source,
          xml_path AS "xmlPath",
          email_message_id AS "emailMessageId",
          import_batch_id AS "importBatchId",
          parsed_payload_json AS "parsedPayload",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM expenses
        ORDER BY issue_date DESC, created_at DESC
      `);

      return rows as ExpenseV1Compat[];
    });
  }

  async createManual(
    tenantId: number,
    input: ExpenseV1Compat,
  ): Promise<ExpenseV1Compat> {
    return this.createBySource(tenantId, input, 'manual');
  }

  async importXml(
    tenantId: number,
    input: ExpenseV1Compat,
  ): Promise<ExpenseV1Compat> {
    return this.createBySource(tenantId, input, 'email_xml');
  }

  private async createBySource(
    tenantId: number,
    input: ExpenseV1Compat,
    source: 'manual' | 'email_xml',
  ): Promise<ExpenseV1Compat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const created = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        INSERT INTO expenses (
          tenant_id,
          supplier_name,
          supplier_tax_id,
          document_type,
          document_number,
          issue_date,
          currency,
          subtotal,
          tax_total,
          total,
          deductible_tax_total,
          status,
          source,
          xml_path,
          email_message_id,
          import_batch_id,
          parsed_payload_json
        )
        VALUES (
          ${tenantId},
          ${String(input.supplierName || 'Unknown Supplier')},
          ${String(input.supplierTaxId || '') || null},
          ${String(input.documentType || 'invoice')},
          ${String(input.documentNumber || '') || `AUTO-${Date.now()}`},
          ${input.issueDate ? new Date(String(input.issueDate)) : new Date()},
          ${String(input.currency || 'USD')},
          ${Math.round(Number(input.subtotal || 0))},
          ${Math.round(Number(input.taxTotal || 0))},
          ${Math.round(Number(input.total || 0))},
          ${Math.round(Number(input.deductibleTaxTotal || 0))},
          ${String(input.status || 'draft')}::expensestatus,
          ${source}::expensesource,
          ${String(input.xmlPath || '') || null},
          ${String(input.emailMessageId || '') || null},
          ${String(input.importBatchId || '') || null},
          ${input.parsedPayload || null}
        )
        RETURNING
          id,
          supplier_name AS "supplierName",
          supplier_tax_id AS "supplierTaxId",
          document_type AS "documentType",
          document_number AS "documentNumber",
          issue_date AS "issueDate",
          currency,
          subtotal,
          tax_total AS "taxTotal",
          total,
          deductible_tax_total AS "deductibleTaxTotal",
          status::text AS status,
          source::text AS source,
          xml_path AS "xmlPath",
          email_message_id AS "emailMessageId",
          import_batch_id AS "importBatchId",
          parsed_payload_json AS "parsedPayload",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      return created[0] as ExpenseV1Compat;
    });
  }
}
