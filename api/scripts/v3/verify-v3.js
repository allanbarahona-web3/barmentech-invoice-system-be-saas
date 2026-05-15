/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const url = process.env.DATABASE_URL_V3;

if (!url) {
  throw new Error('DATABASE_URL_V3 is required');
}

const prisma = new PrismaClient({ datasources: { db: { url } }, log: ['warn', 'error'] });

(async () => {
  try {
    const result = await prisma.$queryRawUnsafe(`
      WITH target_tables AS (
        SELECT unnest(ARRAY[
          'tenant_users','auth_sessions','tenant_domains','tenant_settings','company_profiles',
          'customers','catalog_items','commercial_documents','commercial_document_items',
          'commercial_document_events','document_receipts','document_receipt_allocations',
          'fiscal_documents','fiscal_document_events','fiscal_jobs','expenses','billing_events'
        ]) AS table_name
      )
      SELECT
        (SELECT count(*) FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name IN (SELECT table_name FROM target_tables)) AS tenant_tables_present,
        (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename IN (SELECT table_name FROM target_tables)) AS tenant_policies_present,
        (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname IN (SELECT table_name FROM target_tables) AND c.relrowsecurity = true) AS tenant_rls_enabled,
        (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname='public' AND c.relname IN (SELECT table_name FROM target_tables) AND c.relforcerowsecurity = true) AS tenant_rls_forced,
        (SELECT count(*) FROM tenants) AS tenants_count,
        (SELECT count(*) FROM tenant_settings) AS tenant_settings_count,
        (SELECT count(*) FROM company_profiles) AS company_profiles_count;
    `);

    const row = result[0];
    const normalized = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]),
    );
    console.log('V3 verification:', normalized);
  } finally {
    await prisma.$disconnect();
  }
})();
