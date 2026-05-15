import { TaxCalculator } from './tax-calculator.interface';
import { FiscalDocumentGenerator } from './fiscal-document-generator.interface';
import { TaxAuthorityGateway } from './tax-authority-gateway.interface';
import { DocumentNumberingStrategy } from './document-numbering-strategy.interface';
import { DocumentTypeMapper } from './document-type-mapper.interface';

export interface FiscalProvider {
  readonly key: string;
  getTaxCalculator(): TaxCalculator;
  getFiscalDocumentGenerator(): FiscalDocumentGenerator;
  getTaxAuthorityGateway(): TaxAuthorityGateway;
  getDocumentNumberingStrategy(): DocumentNumberingStrategy;
  getDocumentTypeMapper(): DocumentTypeMapper;
}
