export interface FiscalNumberingInput {
  tenantId: number;
  documentType: string;
  issuedAt: Date;
}

export interface DocumentNumberingStrategy {
  generateFiscalDocumentNumber(input: FiscalNumberingInput): Promise<string | null>;
}
