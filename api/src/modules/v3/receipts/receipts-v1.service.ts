import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { V3DbService } from '../v3-db.service';

export interface ReceiptV1Compat {
  [key: string]: unknown;
}

export interface ReceiptAllocationV1Compat {
  [key: string]: unknown;
}

@Injectable()
export class ReceiptsV1Service {
  constructor(private readonly v3DbService: V3DbService) {}

  async createReceipt(
    tenantId: number,
    input: ReceiptV1Compat,
  ): Promise<ReceiptV1Compat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const created = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        INSERT INTO document_receipts (
          tenant_id,
          customer_id,
          amount,
          currency,
          method,
          reference,
          external_payment_id,
          status,
          idempotency_key,
          paid_at
        )
        VALUES (
          ${tenantId},
          ${String(input.customerId || '') || null},
          ${Math.round(Number(input.amount || 0))},
          ${String(input.currency || 'USD')},
          ${String(input.method || 'manual')},
          ${String(input.reference || '') || null},
          ${String(input.externalPaymentId || '') || null},
          ${String(input.status || 'confirmed')}::receiptstatus,
          ${String(input.idempotencyKey || crypto.randomUUID())},
          ${input.paidAt ? new Date(String(input.paidAt)) : new Date()}
        )
        RETURNING
          id,
          customer_id AS "customerId",
          amount,
          currency,
          method,
          reference,
          external_payment_id AS "externalPaymentId",
          status::text AS status,
          idempotency_key AS "idempotencyKey",
          paid_at AS "paidAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      return created[0] as ReceiptV1Compat;
    });
  }

  async allocate(
    tenantId: number,
    id: string,
    input: ReceiptAllocationV1Compat,
  ): Promise<{ success: true }> {
    await this.v3DbService.withTenant(tenantId, async (tx) => {
      const receiptRows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT id FROM document_receipts WHERE id = ${id} LIMIT 1
      `);
      if (!receiptRows[0]) throw new NotFoundException(`Receipt with id ${id} not found`);

      const documentId = String(input.commercialDocumentId || '');
      const allocatedAmount = Math.round(Number(input.allocatedAmount || 0));
      if (!documentId || allocatedAmount <= 0) {
        throw new NotFoundException('commercialDocumentId and allocatedAmount are required');
      }

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO document_receipt_allocations (
          tenant_id,
          receipt_id,
          commercial_document_id,
          allocated_amount
        )
        VALUES (
          ${tenantId},
          ${id},
          ${documentId},
          ${allocatedAmount}
        )
        ON CONFLICT (tenant_id, receipt_id, commercial_document_id)
        DO UPDATE SET allocated_amount = EXCLUDED.allocated_amount
      `);

      await this.recomputeDocumentStatus(tx, documentId);
    });

    return { success: true };
  }

  async listByDocument(
    tenantId: number,
    id: string,
  ): Promise<ReceiptV1Compat[]> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          r.id,
          r.customer_id AS "customerId",
          r.amount,
          r.currency,
          r.method,
          r.reference,
          r.external_payment_id AS "externalPaymentId",
          r.status::text AS status,
          r.idempotency_key AS "idempotencyKey",
          r.paid_at AS "paidAt",
          r.created_at AS "createdAt",
          r.updated_at AS "updatedAt",
          a.allocated_amount AS "allocatedAmount"
        FROM document_receipts r
        INNER JOIN document_receipt_allocations a
          ON a.receipt_id = r.id
        WHERE a.commercial_document_id = ${id}
        ORDER BY r.paid_at DESC
      `);

      return rows as ReceiptV1Compat[];
    });
  }

  private async recomputeDocumentStatus(
    tx: PrismaClient,
    documentId: string,
  ): Promise<void> {
    const totals = await tx.$queryRaw<Array<{ total: number; allocated: number | null }>>(Prisma.sql`
      SELECT
        d.total,
        (
          SELECT SUM(a.allocated_amount)::int
          FROM document_receipt_allocations a
          WHERE a.commercial_document_id = d.id
        ) AS allocated
      FROM commercial_documents d
      WHERE d.id = ${documentId}
      LIMIT 1
    `);

    const data = totals[0];
    if (!data) return;

    const allocated = data.allocated || 0;
    const nextStatus = allocated >= data.total ? 'paid' : allocated > 0 ? 'partial_paid' : 'issued';

    await tx.$executeRaw(Prisma.sql`
      UPDATE commercial_documents
      SET status = ${nextStatus}::commercialdocumentstatus, updated_at = now()
      WHERE id = ${documentId}
    `);

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO commercial_document_events (
        tenant_id,
        commercial_document_id,
        event_type,
        event_at,
        meta_json
      )
      VALUES (
        current_setting('app.tenant_id', true)::int,
        ${documentId},
        'PAYMENT_REGISTERED',
        now(),
        ${JSON.stringify({ status: nextStatus, allocated })}::jsonb
      )
    `);
  }
}
