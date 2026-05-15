import { Injectable } from '@nestjs/common';
import {
  DocumentNumberingStrategy,
  DocumentTypeMapper,
  FiscalDocumentGenerationInput,
  FiscalDocumentGenerationResult,
  FiscalDocumentGenerator,
  FiscalNumberingInput,
  FiscalProvider,
  TaxAuthorityGateway,
  TaxAuthoritySubmissionInput,
  TaxAuthoritySubmissionResult,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxCalculator,
} from '../interfaces';

@Injectable()
class DefaultTaxCalculator implements TaxCalculator {
  async calculate(_input: TaxCalculationInput): Promise<TaxCalculationResult> {
    return { taxAmount: 0, breakdown: [] };
  }
}

@Injectable()
class DefaultFiscalDocumentGenerator implements FiscalDocumentGenerator {
  async generate(input: FiscalDocumentGenerationInput): Promise<FiscalDocumentGenerationResult> {
    return {
      format: 'json',
      content: JSON.stringify({
        mode: 'default',
        tenantId: input.tenantId,
        documentType: input.documentType,
        orderId: input.orderId,
      }),
    };
  }
}

@Injectable()
class DefaultTaxAuthorityGateway implements TaxAuthorityGateway {
  async submit(_input: TaxAuthoritySubmissionInput): Promise<TaxAuthoritySubmissionResult> {
    return {
      submitted: false,
      status: 'not_required',
      message: 'No tax authority integration configured for this country pack.',
    };
  }
}

@Injectable()
class DefaultDocumentNumberingStrategy implements DocumentNumberingStrategy {
  async generateFiscalDocumentNumber(_input: FiscalNumberingInput): Promise<string | null> {
    return null;
  }
}

@Injectable()
class DefaultDocumentTypeMapper implements DocumentTypeMapper {
  mapCommercialToFiscalDocumentType(commercialType: string): string {
    return commercialType || 'generic';
  }
}

@Injectable()
export class DefaultFiscalProvider implements FiscalProvider {
  readonly key = 'default';

  constructor(
    private readonly taxCalculator: DefaultTaxCalculator,
    private readonly documentGenerator: DefaultFiscalDocumentGenerator,
    private readonly taxAuthorityGateway: DefaultTaxAuthorityGateway,
    private readonly numberingStrategy: DefaultDocumentNumberingStrategy,
    private readonly documentTypeMapper: DefaultDocumentTypeMapper,
  ) {}

  getTaxCalculator(): TaxCalculator {
    return this.taxCalculator;
  }

  getFiscalDocumentGenerator(): FiscalDocumentGenerator {
    return this.documentGenerator;
  }

  getTaxAuthorityGateway(): TaxAuthorityGateway {
    return this.taxAuthorityGateway;
  }

  getDocumentNumberingStrategy(): DocumentNumberingStrategy {
    return this.numberingStrategy;
  }

  getDocumentTypeMapper(): DocumentTypeMapper {
    return this.documentTypeMapper;
  }
}

export const defaultFiscalProviderInternals = [
  DefaultTaxCalculator,
  DefaultFiscalDocumentGenerator,
  DefaultTaxAuthorityGateway,
  DefaultDocumentNumberingStrategy,
  DefaultDocumentTypeMapper,
];
