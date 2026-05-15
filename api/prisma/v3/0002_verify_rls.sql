-- V3 RLS verification query for tenant-scoped tables

SELECT
  c.relname AS tablename,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls,
  (
    SELECT COUNT(*)
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = c.relname
  ) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'tenant_users',
    'auth_sessions',
    'tenant_domains',
    'tenant_settings',
    'company_profiles',
    'customers',
    'catalog_items',
    'commercial_documents',
    'commercial_document_items',
    'commercial_document_events',
    'document_receipts',
    'document_receipt_allocations',
    'fiscal_documents',
    'fiscal_document_events',
    'fiscal_jobs',
    'expenses',
    'billing_events'
  )
ORDER BY c.relname;
