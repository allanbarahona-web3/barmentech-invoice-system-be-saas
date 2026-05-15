export const V3_API_PREFIX = '/v1';

export const FE_COMPAT_ENDPOINTS = {
  documents: {
    list: `${V3_API_PREFIX}/documents`,
    getById: `${V3_API_PREFIX}/documents/:id`,
    create: `${V3_API_PREFIX}/documents`,
    update: `${V3_API_PREFIX}/documents/:id`,
    remove: `${V3_API_PREFIX}/documents/:id`,
    updateStatus: `${V3_API_PREFIX}/documents/:id/status`,
    recordExportPdf: `${V3_API_PREFIX}/documents/:id/export-pdf`,
    recordSent: `${V3_API_PREFIX}/documents/:id/sent`,
    archive: `${V3_API_PREFIX}/documents/:id/archive`,
    convertQuoteToInvoice: `${V3_API_PREFIX}/documents/:id/convert-to-invoice`,
  },
  customers: {
    list: `${V3_API_PREFIX}/customers`,
    getById: `${V3_API_PREFIX}/customers/:id`,
    create: `${V3_API_PREFIX}/customers`,
    update: `${V3_API_PREFIX}/customers/:id`,
    remove: `${V3_API_PREFIX}/customers/:id`,
  },
  catalogItems: {
    list: `${V3_API_PREFIX}/catalog-items`,
    getById: `${V3_API_PREFIX}/catalog-items/:id`,
    create: `${V3_API_PREFIX}/catalog-items`,
    update: `${V3_API_PREFIX}/catalog-items/:id`,
    remove: `${V3_API_PREFIX}/catalog-items/:id`,
  },
  tenantSettings: {
    get: `${V3_API_PREFIX}/tenant-settings`,
    save: `${V3_API_PREFIX}/tenant-settings`,
    completeOnboarding: `${V3_API_PREFIX}/tenant-settings/complete-onboarding`,
  },
  companyProfile: {
    get: `${V3_API_PREFIX}/company-profile`,
    save: `${V3_API_PREFIX}/company-profile`,
    update: `${V3_API_PREFIX}/company-profile`,
  },
  receipts: {
    createReceipt: `${V3_API_PREFIX}/receipts`,
    allocate: `${V3_API_PREFIX}/receipts/:id/allocations`,
    listByDocument: `${V3_API_PREFIX}/documents/:id/receipts`,
  },
  expenses: {
    list: `${V3_API_PREFIX}/expenses`,
    createManual: `${V3_API_PREFIX}/expenses/manual`,
    importXml: `${V3_API_PREFIX}/expenses/import-xml`,
  },
} as const;

export interface FeInvoiceItemCompat {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
  discount: number;
  productId?: string;
}

export interface FeInvoiceSentCompat {
  toEmail?: string;
  message?: string;
  sentAt: string;
  method: 'manual' | 'email';
}

export interface FeRecurringConfigCompat {
  enabled: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  startDate: string;
  endDate?: string;
  nextGenerationDate: string;
  lastGeneratedDate?: string;
  parentInvoiceId?: string;
}

export interface FeScheduledSendCompat {
  enabled: boolean;
  scheduledFor: string;
  toEmail: string;
  cc?: string[];
  message?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

export interface FeInvoiceEventCompat {
  id: string;
  type:
    | 'CREATED'
    | 'CREATED_DRAFT'
    | 'UPDATED'
    | 'EXPORTED_PDF'
    | 'MARKED_ISSUED'
    | 'SENT'
    | 'QUOTE_SENT'
    | 'CONVERTED_TO_INVOICE'
    | 'CREATED_FROM_QUOTE'
    | 'ARCHIVED'
    | 'MARKED_PAID'
    | 'PAYMENT_REGISTERED'
    | 'PAYMENT_DELETED';
  at: string;
  meta?: Record<string, string>;
}

// Compatibility response shape expected by FE invoice modules.
export interface FeInvoiceCompat {
  id: string;
  type: string;
  invoiceNumber: string;
  customerId: string;
  currency: string;
  items: FeInvoiceItemCompat[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  paymentTerms: 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60' | 'net_90' | 'custom';
  customNetDays?: number;
  dueDate?: string;
  exchangeRate?: number;
  exchangeRateDate?: string;
  recurringConfig?: FeRecurringConfigCompat;
  scheduledSend?: FeScheduledSendCompat;
  originQuoteId?: string;
  archivedAt?: string;
  sent?: FeInvoiceSentCompat;
  events?: FeInvoiceEventCompat[];
}

export interface FeInvoiceCreateInputCompat {
  type: string;
  customerId: string;
  currency?: string;
  paymentTerms: 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60' | 'net_90' | 'custom';
  customNetDays?: number;
  items: Array<{
    description: string;
    qty: number;
    unitPrice: number;
    discount: number;
    productId?: string;
  }>;
  deliveryFee: number;
  status: string;
  recurringConfig?: FeRecurringConfigCompat;
  scheduledSend?: FeScheduledSendCompat;
}

export interface FeCustomerCompat {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  country?: string;
  state?: string;
  city?: string;
  zipCode?: string;
  addressDetail?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive';
  contactPreferences: {
    preferredChannel: 'whatsapp' | 'email' | 'phone' | 'unspecified';
    consentStatus: 'unknown' | 'granted' | 'denied';
    preferredTime: 'any' | 'morning' | 'afternoon' | 'evening';
    allowEmail: boolean;
    allowWhatsApp: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FeProductCompat {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  type: 'product' | 'service';
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
