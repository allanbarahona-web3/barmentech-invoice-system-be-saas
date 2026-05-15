export interface TaxAuthoritySubmissionInput {
  tenantId: number;
  documentType: string;
  documentNumber: string;
  payload: string;
}

export interface TaxAuthoritySubmissionResult {
  submitted: boolean;
  externalId?: string | null;
  status: 'not_required' | 'queued' | 'accepted' | 'rejected' | 'error';
  message?: string;
}

export interface TaxAuthorityGateway {
  submit(input: TaxAuthoritySubmissionInput): Promise<TaxAuthoritySubmissionResult>;
}
