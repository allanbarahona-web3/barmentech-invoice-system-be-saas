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
} from '../../fiscal-core/interfaces';

@Injectable()
class CostaRicaTaxCalculator implements TaxCalculator {
  async calculate(_input: TaxCalculationInput): Promise<TaxCalculationResult> {
    // Placeholder for CR IVA/exoneraciones logic.
    return { taxAmount: 0, breakdown: [] };
  }
}

@Injectable()
class CostaRicaFiscalDocumentGenerator implements FiscalDocumentGenerator {
  async generate(input: FiscalDocumentGenerationInput): Promise<FiscalDocumentGenerationResult> {
    // Placeholder for CR XML generation.
    return {
      format: 'json',
      content: JSON.stringify({
        mode: 'country-pack-cr',
        tenantId: input.tenantId,
        documentType: input.documentType,
        orderId: input.orderId,
      }),
    };
  }
}

@Injectable()
class CostaRicaTaxAuthorityGateway implements TaxAuthorityGateway {
  async submit(_input: TaxAuthoritySubmissionInput): Promise<TaxAuthoritySubmissionResult> {
    // Placeholder for Hacienda submit/status polling.
    return {
      submitted: false,
      status: 'not_required',
      message: 'Costa Rica tax authority gateway is not implemented in Phase 1.',
    };
  }
}

@Injectable()
class CostaRicaDocumentNumberingStrategy implements DocumentNumberingStrategy {
  async generateFiscalDocumentNumber(_input: FiscalNumberingInput): Promise<string | null> {
    // Placeholder for legal document numbering sequence.
    return null;
  }
}

@Injectable()
class CostaRicaDocumentTypeMapper implements DocumentTypeMapper {
  mapCommercialToFiscalDocumentType(commercialType: string): string {
    if (!commercialType) {
      return 'FE';
    }

    // Placeholder mapping table for CR electronic documents.
    if (commercialType.toLowerCase() === 'order') {
      return 'FE';
    }

    return 'FE';
  }
}

@Injectable()
export class CostaRicaFiscalProvider implements FiscalProvider {
  readonly key = 'cr';

  constructor(
    private readonly taxCalculator: CostaRicaTaxCalculator,
    private readonly documentGenerator: CostaRicaFiscalDocumentGenerator,
    private readonly taxAuthorityGateway: CostaRicaTaxAuthorityGateway,
    private readonly numberingStrategy: CostaRicaDocumentNumberingStrategy,
    private readonly documentTypeMapper: CostaRicaDocumentTypeMapper,
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

export const costaRicaFiscalProviderInternals = [
  CostaRicaTaxCalculator,
  CostaRicaFiscalDocumentGenerator,
  CostaRicaTaxAuthorityGateway,
  CostaRicaDocumentNumberingStrategy,
  CostaRicaDocumentTypeMapper,
];
