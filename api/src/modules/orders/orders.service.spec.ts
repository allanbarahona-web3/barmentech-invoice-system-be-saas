import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  it('creates order and fiscal document inside the same transaction', async () => {
    const tx = {
      product: {
        findMany: jest.fn().mockResolvedValue([{ id: 'p1', price: 100 }]),
      },
      order: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
          id: 'order-1',
          orderNumber: 'ORD-20260514-0001',
          currency: 'CRC',
          subtotalAmount: 200,
          taxAmount: 26,
          totalAmount: 226,
          items: [],
        }),
      },
    } as any;

    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (trx: any) => Promise<unknown>) => callback(tx)),
    } as any;

    const preparedFiscalData = {
      tenantId: 1,
      countryCode: 'CR',
      countryPack: 'cr',
      documentType: 'invoice',
      fiscalNumber: 'FAC-001',
      taxTotal: 26,
      payloadSnapshot: { mocked: true },
      providerResponse: { submitted: true },
      status: 'SUBMITTED',
    } as any;

    const fiscalApplicationService = {
      prepareOrderFiscalData: jest.fn().mockResolvedValue(preparedFiscalData),
      createFiscalDocumentForOrder: jest.fn().mockResolvedValue({ id: 'fd-1' }),
    } as any;

    const service = new OrdersService(prisma, fiscalApplicationService);

    const result = await service.create(1, {
      customerId: 'cust-1',
      currency: 'CRC',
      items: [{ productId: 'p1', quantity: 2 }],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.product.findMany).toHaveBeenCalledTimes(1);
    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(fiscalApplicationService.prepareOrderFiscalData).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 1,
        currency: 'CRC',
        subtotal: 200,
      }),
      tx,
    );
    expect(fiscalApplicationService.createFiscalDocumentForOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 1,
        orderId: 'order-1',
        preparedData: preparedFiscalData,
      }),
      tx,
    );
    expect(result.id).toBe('order-1');
  });

  it('throws when order has no items', async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const fiscalApplicationService = {} as any;
    const service = new OrdersService(prisma, fiscalApplicationService);

    await expect(
      service.create(1, {
        customerId: 'cust-1',
        currency: 'CRC',
        items: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
