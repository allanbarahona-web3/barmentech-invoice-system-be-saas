import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from './orders.service';
import { FiscalCoreModule } from '../fiscal-core/fiscal-core.module';

/**
 * Integration test: OrdersService creates both Order and FiscalDocument
 * in the same transactional context with real DB operations.
 * Tests verify:
 * - Order creation with auto-generated orderNumber
 * - Fiscal document persistence via FiscalApplicationService
 * - Tenant isolation (RLS concept)
 * - Data cleanup via transaction rollback
 */
describe('OrdersService Integration (Fiscal + DB)', () => {
  let ordersService: OrdersService;
  let prisma: PrismaService;

  jest.setTimeout(30000);

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [FiscalCoreModule],
      providers: [OrdersService, PrismaService],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create order and fiscal_documents in same transaction', async () => {
    jest.setTimeout(30000);

    const { tenant, product } = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name: 'Test Tenant Order+Fiscal',
          slug: `test-fiscal-${Date.now()}`,
          countryCode: 'CR',
          countryPack: 'cr',
          config: {},
        },
      });

      const p = await tx.product.create({
        data: {
          tenantId: t.id,
          name: 'Integration Test Product',
          slug: `int-prod-${Date.now()}`,
          description: 'Product for order+fiscal integration test',
          price: 100,
          stock: 100,
          isActive: true,
        },
      });

      return { tenant: t, product: p };
    });

    const createdOrder = await ordersService.create(tenant.id, {
      customerId: null,
      currency: 'CRC',
      items: [{ productId: product.id, quantity: 2 }],
    });

    expect(createdOrder).toBeDefined();
    expect(createdOrder.id).toBeDefined();
    expect(createdOrder.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);
    expect(createdOrder.totalAmount).toBeGreaterThanOrEqual(createdOrder.subtotalAmount);

    const fiscalDocs = await prisma.fiscalDocument.findMany({
      where: { tenantId: tenant.id, orderId: createdOrder.id },
    });

    expect(fiscalDocs).toHaveLength(1);
    expect(fiscalDocs[0].documentType).toBeDefined();
    expect(['invoice', 'FE']).toContain(fiscalDocs[0].documentType);

    // Cleanup
    await prisma.$transaction(async (tx) => {
      await tx.fiscalDocument.deleteMany({ where: { tenantId: tenant.id } });
      await tx.orderItem.deleteMany({ where: { tenantId: tenant.id } });
      await tx.order.deleteMany({ where: { tenantId: tenant.id } });
      await tx.product.deleteMany({ where: { tenantId: tenant.id } });
      await tx.tenant.delete({ where: { id: tenant.id } });
    });
  });

  it('should maintain tenant isolation (no cross-tenant fiscal documents)', async () => {
    jest.setTimeout(30000);

    const { tenantA, tenantB, productA } = await prisma.$transaction(async (tx) => {
      const tA = await tx.tenant.create({
        data: {
          name: 'Tenant A Isolation Test',
          slug: `tenant-a-${Date.now()}`,
          countryCode: 'CR',
          countryPack: 'cr',
          config: {},
        },
      });

      const tB = await tx.tenant.create({
        data: {
          name: 'Tenant B Isolation Test',
          slug: `tenant-b-${Date.now()}`,
          countryCode: 'CR',
          countryPack: 'cr',
          config: {},
        },
      });

      const pA = await tx.product.create({
        data: {
          tenantId: tA.id,
          name: 'Product A',
          slug: `prod-a-${Date.now()}`,
          price: 100,
          stock: 100,
          isActive: true,
        },
      });

      return { tenantA: tA, tenantB: tB, productA: pA };
    });

    const orderA = await ordersService.create(tenantA.id, {
      customerId: null,
      currency: 'CRC',
      items: [{ productId: productA.id, quantity: 1 }],
    });

    const fdA = await prisma.fiscalDocument.findFirst({
      where: { tenantId: tenantA.id, orderId: orderA.id },
    });

    expect(fdA).toBeDefined();
    expect(fdA.tenantId).toBe(tenantA.id);

    const fdB = await prisma.fiscalDocument.findFirst({
      where: { tenantId: tenantB.id },
    });

    expect(fdB).toBeNull();

    // Cleanup
    await prisma.$transaction(async (tx) => {
      await tx.fiscalDocument.deleteMany({
        where: { tenantId: { in: [tenantA.id, tenantB.id] } },
      });
      await tx.orderItem.deleteMany({
        where: { tenantId: { in: [tenantA.id, tenantB.id] } },
      });
      await tx.order.deleteMany({
        where: { tenantId: { in: [tenantA.id, tenantB.id] } },
      });
      await tx.product.deleteMany({
        where: { tenantId: { in: [tenantA.id, tenantB.id] } },
      });
      await tx.tenant.deleteMany({
        where: { id: { in: [tenantA.id, tenantB.id] } },
      });
    });
  });
});
