export interface FiscalDocumentGenerationInput {
  tenantId: number;
  countryCode?: string | null;
  documentType: string;
  orderId: string;
  issuedAt: Date;
  payload: Record<string, unknown>;
}

export interface FiscalDocumentGenerationResult {
  format: 'json' | 'xml' | 'pdf' | 'none';
  content: string;
}

export interface FiscalDocumentGenerator {
  generate(input: FiscalDocumentGenerationInput): Promise<FiscalDocumentGenerationResult>;
}
