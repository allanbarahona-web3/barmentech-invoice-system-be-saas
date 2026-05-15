/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const url = process.env.DATABASE_URL_V3;

if (!url) {
  throw new Error('DATABASE_URL_V3 is required');
}

const prisma = new PrismaClient({ datasources: { db: { url } }, log: ['warn', 'error'] });

(async () => {
  try {
    await prisma.$executeRawUnsafe(`SELECT set_config('app.is_superadmin', 'true', false)`);
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        platform_audit_events,
        platform_sessions,
        auth_sessions,
        fiscal_document_events,
        fiscal_jobs,
        fiscal_documents,
        document_receipt_allocations,
        document_receipts,
        commercial_document_events,
        commercial_document_items,
        commercial_documents,
        expenses,
        billing_events,
        catalog_items,
        customers,
        company_profiles,
        tenant_settings,
        tenant_domains,
        tenant_users,
        platform_users,
        tenants
      RESTART IDENTITY CASCADE;
    `);
    console.log('V3 database reset completed');
  } finally {
    await prisma.$disconnect();
  }
})();
