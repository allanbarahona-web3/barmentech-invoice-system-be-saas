import { FiscalApplicationService, PreparedOrderFiscalData } from './fiscal-application.service';

describe('FiscalApplicationService', () => {
  const buildProvider = (status: 'not_required' | 'queued' | 'accepted' | 'rejected' | 'error') => ({
    getDocumentTypeMapper: () => ({
      mapCommercialToFiscalDocumentType: jest.fn().mockReturnValue('invoice'),
    }),
    getTaxCalculator: () => ({
      calculate: jest.fn().mockResolvedValue({ taxAmount: 130, breakdown: [] }),
    }),
    getDocumentNumberingStrategy: () => ({
      generateFiscalDocumentNumber: jest.fn().mockResolvedValue('FAC-001'),
    }),
    getFiscalDocumentGenerator: () => ({
      generate: jest.fn().mockResolvedValue({
        format: 'json',
        content: '{"ok":true}',
        metadata: {},
      }),
    }),
    getTaxAuthorityGateway: () => ({
      submit: jest.fn().mockResolvedValue({ submitted: true, status }),
    }),
  });

  it('maps accepted gateway status to ACCEPTED fiscal status', async () => {
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          countryCode: 'CR',
          countryPack: 'cr',
          config: {},
        }),
      },
    } as any;

    const resolver = {
      resolveForCountryPack: jest.fn().mockReturnValue(buildProvider('accepted')),
    } as any;

    const service = new FiscalApplicationService(prisma, resolver);

    const result = await service.prepareOrderFiscalData({
      tenantId: 1,
      currency: 'CRC',
      subtotal: 1000,
      total: 1130,
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000, totalPrice: 1000 }],
      commercialType: 'order',
    });

    expect(result.status).toBe('ACCEPTED');
    expect(result.fiscalNumber).toBe('FAC-001');
    expect(result.taxTotal).toBe(130);
  });

  it('persists submittedAt when status is SUBMITTED', async () => {
    const fiscalDocumentCreate = jest.fn().mockResolvedValue({ id: 'fd-1' });
    const prisma = {
      fiscalDocument: {
        create: fiscalDocumentCreate,
      },
    } as any;

    const service = new FiscalApplicationService(prisma, {} as any);

    const preparedData: PreparedOrderFiscalData = {
      tenantId: 1,
      countryCode: 'CR',
      countryPack: 'cr',
      documentType: 'invoice',
      fiscalNumber: 'FAC-001',
      taxTotal: 130,
      payloadSnapshot: { a: 1 },
      providerResponse: { submitted: true },
      status: 'SUBMITTED',
    };

    await service.createFiscalDocumentForOrder({
      tenantId: 1,
      orderId: 'order-1',
      currency: 'CRC',
      subtotal: 1000,
      taxTotal: 130,
      total: 1130,
      preparedData,
    });

    expect(fiscalDocumentCreate).toHaveBeenCalledTimes(1);
    const createCallArg = fiscalDocumentCreate.mock.calls[0][0];
    expect(createCallArg.data.status).toBe('SUBMITTED');
    expect(createCallArg.data.submittedAt).toBeInstanceOf(Date);
    expect(createCallArg.data.acceptedAt).toBeNull();
  });
});
