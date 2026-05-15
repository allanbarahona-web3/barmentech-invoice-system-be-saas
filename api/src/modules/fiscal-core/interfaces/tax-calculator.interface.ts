export interface TaxCalculationLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface TaxCalculationInput {
  tenantId: number;
  currency: string;
  subtotalAmount: number;
  items: TaxCalculationLineItem[];
}

export interface TaxCalculationResult {
  taxAmount: number;
  breakdown?: Array<{
    code: string;
    rate: number;
    amount: number;
  }>;
}

export interface TaxCalculator {
  calculate(input: TaxCalculationInput): Promise<TaxCalculationResult>;
}
