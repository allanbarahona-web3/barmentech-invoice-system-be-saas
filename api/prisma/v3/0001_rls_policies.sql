-- V3 RLS baseline policies (tenant-scoped tables)
-- Apply after creating tables with Prisma migration.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
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
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items FORCE ROW LEVEL SECURITY;
ALTER TABLE commercial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE commercial_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_document_items FORCE ROW LEVEL SECURITY;
ALTER TABLE commercial_document_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_document_events FORCE ROW LEVEL SECURITY;
ALTER TABLE document_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE document_receipt_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_receipt_allocations FORCE ROW LEVEL SECURITY;
ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE fiscal_document_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_document_events FORCE ROW LEVEL SECURITY;
ALTER TABLE fiscal_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_users_all_isolation ON tenant_users
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY auth_sessions_all_isolation ON auth_sessions
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY tenant_domains_all_isolation ON tenant_domains
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY tenant_settings_all_isolation ON tenant_settings
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY company_profiles_all_isolation ON company_profiles
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY customers_all_isolation ON customers
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY catalog_items_all_isolation ON catalog_items
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY commercial_documents_all_isolation ON commercial_documents
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY commercial_document_items_all_isolation ON commercial_document_items
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY commercial_document_events_all_isolation ON commercial_document_events
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY document_receipts_all_isolation ON document_receipts
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY document_receipt_allocations_all_isolation ON document_receipt_allocations
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY fiscal_documents_all_isolation ON fiscal_documents
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY fiscal_document_events_all_isolation ON fiscal_document_events
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY fiscal_jobs_all_isolation ON fiscal_jobs
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY expenses_all_isolation ON expenses
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );

CREATE POLICY billing_events_all_isolation ON billing_events
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  )
  WITH CHECK (
    tenant_id = current_setting('app.tenant_id', true)::int
    OR current_setting('app.is_superadmin', true) = 'true'
  );
