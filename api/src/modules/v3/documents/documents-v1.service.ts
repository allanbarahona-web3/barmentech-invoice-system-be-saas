import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  FeInvoiceCompat,
  FeInvoiceCreateInputCompat,
} from '../contracts/fe-compatibility.contract';
import {
  mapCommercialDocumentToFeInvoice,
  mapFeInvoiceCreateInputToDocument,
  mapFeStatusToDocumentStatus,
} from '../contracts/fe-compatibility.mapper';
import { V3DbService } from '../v3-db.service';

interface CommercialDocumentRow {
  id: string;
  type: string;
  number: string;
  customerId: string | null;
  currency: string;
  subtotal: number;
  taxTotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  paymentTerms: string;
  customNetDays: number | null;
  dueDate: Date | null;
  recurringConfig: Record<string, unknown> | null;
  scheduledSend: Record<string, unknown> | null;
  originQuoteId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CommercialDocumentItemRow {
  id: string;
  description: string;
  qty: Prisma.Decimal;
  unitPrice: number;
  discountPct: Prisma.Decimal;
  catalogItemId: string | null;
}

interface CommercialDocumentEventRow {
  id: string;
  eventType: string;
  eventAt: Date;
  meta: Record<string, unknown> | null;
}

interface TenantSettingsSequenceRow {
  invoicePrefix: string;
  nextInvoiceNumber: number;
  draftPrefix: string;
  nextDraftNumber: number;
  quotePrefix: string;
  nextQuoteNumber: number;
}

@Injectable()
export class DocumentsV1Service {
  constructor(private readonly v3DbService: V3DbService) {}

  async list(tenantId: number): Promise<FeInvoiceCompat[]> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);

      const rows = await tx.$queryRaw<CommercialDocumentRow[]>(Prisma.sql`
        SELECT
          id,
          type,
          number,
          customer_id AS "customerId",
          currency,
          subtotal,
          tax_total AS "taxTotal",
          delivery_fee AS "deliveryFee",
          total,
          status::text AS status,
          payment_terms AS "paymentTerms",
          custom_net_days AS "customNetDays",
          due_date AS "dueDate",
          recurring_config_json AS "recurringConfig",
          scheduled_send_json AS "scheduledSend",
          origin_quote_id AS "originQuoteId",
          archived_at AS "archivedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM commercial_documents
        ORDER BY created_at DESC
      `);

      return Promise.all(rows.map((row) => this.hydrateInvoice(tx, row)));
    });
  }

  async getById(tenantId: number, id: string): Promise<FeInvoiceCompat> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);

      const row = await this.getDocumentRowById(tx, id);
      if (!row) throw new NotFoundException(`Document with id ${id} not found`);

      return this.hydrateInvoice(tx, row);
    });
  }

  async create(
    tenantId: number,
    input: FeInvoiceCreateInputCompat,
  ): Promise<FeInvoiceCompat> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);

      const mapped = mapFeInvoiceCreateInputToDocument(input);
      const nextNumber = await this.reserveNextDocumentNumber(tx, input.type);

      const createdRows = await tx.$queryRaw<CommercialDocumentRow[]>(Prisma.sql`
        INSERT INTO commercial_documents (
          tenant_id,
          type,
          number,
          customer_id,
          currency,
          subtotal,
          tax_total,
          delivery_fee,
          total,
          status,
          payment_terms,
          custom_net_days,
          due_date,
          recurring_config_json,
          scheduled_send_json,
          origin_quote_id,
          archived_at
        )
        VALUES (
          ${tenantId},
          ${mapped.document.type},
          ${nextNumber},
          ${mapped.document.customerId},
          ${mapped.document.currency},
          ${Math.round(mapped.document.subtotal)},
          ${Math.round(mapped.document.taxTotal)},
          ${Math.round(mapped.document.deliveryFee)},
          ${Math.round(mapped.document.total)},
          ${mapped.document.status},
          ${mapped.document.paymentTerms},
          ${mapped.document.customNetDays ?? null},
          ${mapped.document.dueDate ?? null},
          ${mapped.document.recurringConfig ?? null},
          ${mapped.document.scheduledSend ?? null},
          ${mapped.document.originQuoteId ?? null},
          ${mapped.document.archivedAt ?? null}
        )
        RETURNING
          id,
          type,
          number,
          customer_id AS "customerId",
          currency,
          subtotal,
          tax_total AS "taxTotal",
          delivery_fee AS "deliveryFee",
          total,
          status::text AS status,
          payment_terms AS "paymentTerms",
          custom_net_days AS "customNetDays",
          due_date AS "dueDate",
          recurring_config_json AS "recurringConfig",
          scheduled_send_json AS "scheduledSend",
          origin_quote_id AS "originQuoteId",
          archived_at AS "archivedAt",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      const created = createdRows[0];

      for (const item of mapped.items) {
        const lineSubtotal = Math.round(item.qty * item.unitPrice);
        const lineTotal = Math.round(lineSubtotal - lineSubtotal * ((item.discountPct || 0) / 100));

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO commercial_document_items (
            tenant_id,
            commercial_document_id,
            description,
            qty,
            unit_price,
            discount_pct,
            catalog_item_id,
            line_subtotal,
            line_total
          )
          VALUES (
            ${tenantId},
            ${created.id},
            ${item.description},
            ${item.qty},
            ${Math.round(item.unitPrice)},
            ${item.discountPct || 0},
            ${item.catalogItemId ?? null},
            ${lineSubtotal},
            ${lineTotal}
          )
        `);
      }

      await this.insertEvent(tx, created.id, 'CREATED', {
        status: mapped.document.status,
      });

      const full = await this.getDocumentRowById(tx, created.id);
      if (!full) throw new NotFoundException('Created document not found');
      return this.hydrateInvoice(tx, full);
    });
  }

  async update(
    tenantId: number,
    id: string,
    input: FeInvoiceCreateInputCompat,
  ): Promise<FeInvoiceCompat> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);

      const mapped = mapFeInvoiceCreateInputToDocument(input);
      const existing = await this.getDocumentRowById(tx, id);
      if (!existing) throw new NotFoundException(`Document with id ${id} not found`);

      await tx.$executeRaw(Prisma.sql`
        UPDATE commercial_documents
        SET
          type = ${mapped.document.type},
          customer_id = ${mapped.document.customerId},
          currency = ${mapped.document.currency},
          subtotal = ${Math.round(mapped.document.subtotal)},
          tax_total = ${Math.round(mapped.document.taxTotal)},
          delivery_fee = ${Math.round(mapped.document.deliveryFee)},
          total = ${Math.round(mapped.document.total)},
          status = ${mapped.document.status}::commercialdocumentstatus,
          payment_terms = ${mapped.document.paymentTerms},
          custom_net_days = ${mapped.document.customNetDays ?? null},
          recurring_config_json = ${mapped.document.recurringConfig ?? null},
          scheduled_send_json = ${mapped.document.scheduledSend ?? null},
          updated_at = now()
        WHERE id = ${id}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM commercial_document_items
        WHERE commercial_document_id = ${id}
      `);

      for (const item of mapped.items) {
        const lineSubtotal = Math.round(item.qty * item.unitPrice);
        const lineTotal = Math.round(lineSubtotal - lineSubtotal * ((item.discountPct || 0) / 100));

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO commercial_document_items (
            tenant_id,
            commercial_document_id,
            description,
            qty,
            unit_price,
            discount_pct,
            catalog_item_id,
            line_subtotal,
            line_total
          )
          VALUES (
            ${tenantId},
            ${id},
            ${item.description},
            ${item.qty},
            ${Math.round(item.unitPrice)},
            ${item.discountPct || 0},
            ${item.catalogItemId ?? null},
            ${lineSubtotal},
            ${lineTotal}
          )
        `);
      }

      await this.insertEvent(tx, id, 'UPDATED', { status: mapped.document.status });
      const full = await this.getDocumentRowById(tx, id);
      if (!full) throw new NotFoundException(`Document with id ${id} not found`);
      return this.hydrateInvoice(tx, full);
    });
  }

  async remove(tenantId: number, id: string): Promise<void> {
    await this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);
      const existing = await this.getDocumentRowById(tx, id);
      if (!existing) throw new NotFoundException(`Document with id ${id} not found`);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM commercial_documents
        WHERE id = ${id}
      `);
    });
  }

  async updateStatus(
    tenantId: number,
    id: string,
    status: string,
  ): Promise<FeInvoiceCompat> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);
      const existing = await this.getDocumentRowById(tx, id);
      if (!existing) throw new NotFoundException(`Document with id ${id} not found`);

      const nextStatus = mapFeStatusToDocumentStatus(status);
      await tx.$executeRaw(Prisma.sql`
        UPDATE commercial_documents
        SET status = ${nextStatus}::commercialdocumentstatus, updated_at = now()
        WHERE id = ${id}
      `);

      await this.insertEvent(tx, id, 'UPDATED', { status: nextStatus });
      const full = await this.getDocumentRowById(tx, id);
      if (!full) throw new NotFoundException(`Document with id ${id} not found`);
      return this.hydrateInvoice(tx, full);
    });
  }

  async recordExportPdf(tenantId: number, id: string): Promise<FeInvoiceCompat> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);
      const existing = await this.getDocumentRowById(tx, id);
      if (!existing) throw new NotFoundException(`Document with id ${id} not found`);

      await this.insertEvent(tx, id, 'EXPORTED_PDF');
      return this.hydrateInvoice(tx, existing);
    });
  }

  async recordSent(
    tenantId: number,
    id: string,
    toEmail?: string,
    message?: string,
  ): Promise<FeInvoiceCompat> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);
      const existing = await this.getDocumentRowById(tx, id);
      if (!existing) throw new NotFoundException(`Document with id ${id} not found`);

      await tx.$executeRaw(Prisma.sql`
        UPDATE commercial_documents
        SET status = 'sent'::commercialdocumentstatus, updated_at = now()
        WHERE id = ${id}
      `);

      await this.insertEvent(tx, id, 'SENT', {
        toEmail: toEmail || '',
        message: message || '',
      });

      const full = await this.getDocumentRowById(tx, id);
      if (!full) throw new NotFoundException(`Document with id ${id} not found`);
      return this.hydrateInvoice(tx, full);
    });
  }

  async archive(tenantId: number, id: string): Promise<FeInvoiceCompat> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);
      const existing = await this.getDocumentRowById(tx, id);
      if (!existing) throw new NotFoundException(`Document with id ${id} not found`);

      await tx.$executeRaw(Prisma.sql`
        UPDATE commercial_documents
        SET
          status = 'archived'::commercialdocumentstatus,
          archived_at = now(),
          updated_at = now()
        WHERE id = ${id}
      `);

      await this.insertEvent(tx, id, 'ARCHIVED');
      const full = await this.getDocumentRowById(tx, id);
      if (!full) throw new NotFoundException(`Document with id ${id} not found`);
      return this.hydrateInvoice(tx, full);
    });
  }

  async convertQuoteToInvoice(
    tenantId: number,
    id: string,
  ): Promise<FeInvoiceCompat> {
    return this.withTenantContext(tenantId, async (tx) => {
      await this.ensureV3TablesReady(tx);
      const existing = await this.getDocumentRowById(tx, id);
      if (!existing) throw new NotFoundException(`Document with id ${id} not found`);

      const nextInvoiceNumber = await this.reserveNextDocumentNumber(tx, 'invoice');
      await tx.$executeRaw(Prisma.sql`
        UPDATE commercial_documents
        SET
          type = 'invoice',
          number = ${nextInvoiceNumber},
          status = 'issued'::commercialdocumentstatus,
          updated_at = now()
        WHERE id = ${id}
      `);

      await this.insertEvent(tx, id, 'CONVERTED_TO_INVOICE', {
        invoiceNumber: nextInvoiceNumber,
      });

      const full = await this.getDocumentRowById(tx, id);
      if (!full) throw new NotFoundException(`Document with id ${id} not found`);
      return this.hydrateInvoice(tx, full);
    });
  }

  private async withTenantContext<T>(
    tenantId: number,
    callback: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.v3DbService.withTenant(tenantId, callback);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown V3 database error';

      if (message.includes('does not exist')) {
        throw new ServiceUnavailableException(
          'V3 tables are not available yet. Create the new V3 database and run migrations before using /v1 documents endpoints.',
        );
      }

      throw error;
    }
  }

  private async ensureV3TablesReady(tx: PrismaClient): Promise<void> {
    const rows = await tx.$queryRaw<Array<{ tableName: string | null }>>(Prisma.sql`
      SELECT to_regclass('public.commercial_documents')::text AS "tableName"
    `);

    if (!rows[0]?.tableName) {
      throw new ServiceUnavailableException(
        'V3 tables are not available. Create and migrate DATABASE_URL_V3 first.',
      );
    }
  }

  private async getDocumentRowById(
    tx: PrismaClient,
    id: string,
  ): Promise<CommercialDocumentRow | null> {
    const rows = await tx.$queryRaw<CommercialDocumentRow[]>(Prisma.sql`
      SELECT
        id,
        type,
        number,
        customer_id AS "customerId",
        currency,
        subtotal,
        tax_total AS "taxTotal",
        delivery_fee AS "deliveryFee",
        total,
        status::text AS status,
        payment_terms AS "paymentTerms",
        custom_net_days AS "customNetDays",
        due_date AS "dueDate",
        recurring_config_json AS "recurringConfig",
        scheduled_send_json AS "scheduledSend",
        origin_quote_id AS "originQuoteId",
        archived_at AS "archivedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM commercial_documents
      WHERE id = ${id}
      LIMIT 1
    `);

    return rows[0] || null;
  }

  private async getDocumentItems(
    tx: PrismaClient,
    documentId: string,
  ): Promise<CommercialDocumentItemRow[]> {
    return tx.$queryRaw<CommercialDocumentItemRow[]>(Prisma.sql`
      SELECT
        id,
        description,
        qty,
        unit_price AS "unitPrice",
        discount_pct AS "discountPct",
        catalog_item_id AS "catalogItemId"
      FROM commercial_document_items
      WHERE commercial_document_id = ${documentId}
      ORDER BY created_at ASC
    `);
  }

  private async getDocumentEvents(
    tx: PrismaClient,
    documentId: string,
  ): Promise<CommercialDocumentEventRow[]> {
    return tx.$queryRaw<CommercialDocumentEventRow[]>(Prisma.sql`
      SELECT
        id,
        event_type AS "eventType",
        event_at AS "eventAt",
        meta_json AS meta
      FROM commercial_document_events
      WHERE commercial_document_id = ${documentId}
      ORDER BY event_at DESC
    `);
  }

  private async hydrateInvoice(
    tx: PrismaClient,
    row: CommercialDocumentRow,
  ): Promise<FeInvoiceCompat> {
    const [items, events] = await Promise.all([
      this.getDocumentItems(tx, row.id),
      this.getDocumentEvents(tx, row.id),
    ]);

    return mapCommercialDocumentToFeInvoice({
      document: {
        ...row,
        dueDate: row.dueDate ? row.dueDate.toISOString() : null,
        archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      items: items.map((item) => ({
        ...item,
        qty: Number(item.qty),
        discountPct: Number(item.discountPct),
      })),
      events: events.map((event) => ({
        ...event,
        eventAt: event.eventAt.toISOString(),
        meta: this.sanitizeMeta(event.meta),
      })),
    });
  }

  private async insertEvent(
    tx: PrismaClient,
    documentId: string,
    eventType: string,
    meta?: Record<string, string>,
  ): Promise<void> {
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
        ${eventType},
        now(),
        ${meta ?? null}
      )
    `);
  }

  private async reserveNextDocumentNumber(
    tx: PrismaClient,
    type: string,
  ): Promise<string> {
    const rows = await tx.$queryRaw<TenantSettingsSequenceRow[]>(Prisma.sql`
      SELECT
        invoice_prefix AS "invoicePrefix",
        next_invoice_number AS "nextInvoiceNumber",
        draft_prefix AS "draftPrefix",
        next_draft_number AS "nextDraftNumber",
        quote_prefix AS "quotePrefix",
        next_quote_number AS "nextQuoteNumber"
      FROM tenant_settings
      WHERE tenant_id = current_setting('app.tenant_id', true)::int
      LIMIT 1
      FOR UPDATE
    `);

    const settings = rows[0];
    if (!settings) {
      throw new ServiceUnavailableException(
        'Tenant settings are missing in V3 database. Seed tenant_settings before creating documents.',
      );
    }

    const normalizedType = type.toLowerCase();
    const sequence =
      normalizedType === 'quote'
        ? {
            prefix: settings.quotePrefix,
            next: settings.nextQuoteNumber,
            updateSql: Prisma.sql`
              UPDATE tenant_settings
              SET next_quote_number = next_quote_number + 1, updated_at = now()
              WHERE tenant_id = current_setting('app.tenant_id', true)::int
            `,
          }
        : normalizedType === 'draft'
          ? {
              prefix: settings.draftPrefix,
              next: settings.nextDraftNumber,
              updateSql: Prisma.sql`
                UPDATE tenant_settings
                SET next_draft_number = next_draft_number + 1, updated_at = now()
                WHERE tenant_id = current_setting('app.tenant_id', true)::int
              `,
            }
          : {
              prefix: settings.invoicePrefix,
              next: settings.nextInvoiceNumber,
              updateSql: Prisma.sql`
                UPDATE tenant_settings
                SET next_invoice_number = next_invoice_number + 1, updated_at = now()
                WHERE tenant_id = current_setting('app.tenant_id', true)::int
              `,
            };

    await tx.$executeRaw(sequence.updateSql);
    return `${sequence.prefix}${String(sequence.next).padStart(6, '0')}`;
  }

  private sanitizeMeta(meta: Record<string, unknown> | null): Record<string, string> {
    if (!meta) return {};

    const sanitized: Record<string, string> = {};
    Object.entries(meta).forEach(([key, value]) => {
      sanitized[key] = typeof value === 'string' ? value : JSON.stringify(value);
    });

    return sanitized;
  }
}
