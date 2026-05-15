import {
  FeInvoiceCompat,
  FeInvoiceCreateInputCompat,
  FeInvoiceEventCompat,
  FeInvoiceItemCompat,
} from './fe-compatibility.contract';

export interface CommercialDocumentRecord {
  id: string;
  type: string;
  number: string;
  customerId: string;
  currency: string;
  subtotal: number;
  taxTotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  paymentTerms: string;
  customNetDays?: number | null;
  dueDate?: string | null;
  recurringConfig?: Record<string, unknown> | null;
  scheduledSend?: Record<string, unknown> | null;
  originQuoteId?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialDocumentItemRecord {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  catalogItemId?: string | null;
}

export interface CommercialDocumentEventRecord {
  id: string;
  eventType: FeInvoiceEventCompat['type'] | string;
  eventAt: string;
  meta?: Record<string, string> | null;
}

export function mapDocumentStatusToFeStatus(status: string): string {
  if (status === 'partial_paid') return 'sent';
  return status;
}

export function mapFeStatusToDocumentStatus(status: string): string {
  if (status === 'sent') return 'sent';
  if (status === 'paid') return 'paid';
  if (status === 'archived') return 'archived';
  if (status === 'issued') return 'issued';
  if (status === 'cancelled') return 'cancelled';
  return 'draft';
}

export function mapItemToFe(item: CommercialDocumentItemRecord): FeInvoiceItemCompat {
  return {
    id: item.id,
    description: item.description,
    qty: item.qty,
    unitPrice: item.unitPrice,
    discount: item.discountPct,
    productId: item.catalogItemId || undefined,
  };
}

export function mapEventToFe(event: CommercialDocumentEventRecord): FeInvoiceEventCompat {
  return {
    id: event.id,
    type: (event.eventType as FeInvoiceEventCompat['type']) || 'UPDATED',
    at: event.eventAt,
    meta: event.meta || undefined,
  };
}

export function mapCommercialDocumentToFeInvoice(input: {
  document: CommercialDocumentRecord;
  items: CommercialDocumentItemRecord[];
  events?: CommercialDocumentEventRecord[];
}): FeInvoiceCompat {
  const { document, items, events } = input;

  return {
    id: document.id,
    type: document.type,
    invoiceNumber: document.number,
    customerId: document.customerId,
    currency: document.currency,
    items: items.map(mapItemToFe),
    subtotal: document.subtotal,
    tax: document.taxTotal,
    deliveryFee: document.deliveryFee,
    total: document.total,
    status: mapDocumentStatusToFeStatus(document.status),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    paymentTerms:
      (document.paymentTerms as
        | 'due_on_receipt'
        | 'net_15'
        | 'net_30'
        | 'net_60'
        | 'net_90'
        | 'custom') || 'due_on_receipt',
    customNetDays: document.customNetDays || undefined,
    dueDate: document.dueDate || undefined,
    recurringConfig: (document.recurringConfig as FeInvoiceCompat['recurringConfig']) || undefined,
    scheduledSend: (document.scheduledSend as FeInvoiceCompat['scheduledSend']) || undefined,
    originQuoteId: document.originQuoteId || undefined,
    archivedAt: document.archivedAt || undefined,
    events: events?.map(mapEventToFe) || undefined,
  };
}

export function mapFeInvoiceCreateInputToDocument(input: FeInvoiceCreateInputCompat): {
  document: Omit<CommercialDocumentRecord, 'id' | 'number' | 'createdAt' | 'updatedAt'>;
  items: Omit<CommercialDocumentItemRecord, 'id'>[];
} {
  const subtotal = input.items.reduce((acc, item) => {
    const lineSubtotal = item.qty * item.unitPrice;
    const discountAmount = lineSubtotal * (item.discount / 100);
    return acc + (lineSubtotal - discountAmount);
  }, 0);

  return {
    document: {
      type: input.type,
      customerId: input.customerId,
      currency: input.currency || 'USD',
      subtotal,
      taxTotal: 0,
      deliveryFee: input.deliveryFee,
      total: subtotal + input.deliveryFee,
      status: mapFeStatusToDocumentStatus(input.status),
      paymentTerms: input.paymentTerms,
      customNetDays: input.customNetDays || undefined,
      dueDate: undefined,
      recurringConfig: input.recurringConfig || undefined,
      scheduledSend: input.scheduledSend || undefined,
      originQuoteId: undefined,
      archivedAt: undefined,
    },
    items: input.items.map((item) => ({
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      discountPct: item.discount,
      catalogItemId: item.productId || undefined,
    })),
  };
}
