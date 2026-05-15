-- Harden RLS coverage for all tenant-scoped tables
-- Includes FORCE RLS and policy recreation.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'tenants',
        'tenant_users',
        'customers',
        'categories',
        'media',
        'products',
        'orders',
        'order_items',
        'payments',
        'tenant_domains',
        'auth_sessions',
        'conversations',
        'messages',
        'leads',
        'credentials',
        'services',
        'billing_events'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users FORCE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media FORCE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_domains FORCE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenants_select_isolation ON tenants
  FOR SELECT
  USING (id = current_setting('app.tenant_id', true)::int);

CREATE POLICY tenants_update_isolation ON tenants
  FOR UPDATE
  USING (id = current_setting('app.tenant_id', true)::int)
  WITH CHECK (id = current_setting('app.tenant_id', true)::int);

CREATE POLICY tenants_delete_isolation ON tenants
  FOR DELETE
  USING (id = current_setting('app.tenant_id', true)::int);

CREATE POLICY tenants_insert_bootstrap ON tenants
  FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY tenant_users_select_isolation ON tenant_users
  FOR SELECT
  USING ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY tenant_users_insert_isolation ON tenant_users
  FOR INSERT
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR "tenantId" = current_setting('app.tenant_id', true)::int
  );

CREATE POLICY tenant_users_update_isolation ON tenant_users
  FOR UPDATE
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY tenant_users_delete_isolation ON tenant_users
  FOR DELETE
  USING ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY customers_all_isolation ON customers
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY categories_all_isolation ON categories
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY media_all_isolation ON media
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY products_all_isolation ON products
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY orders_all_isolation ON orders
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY order_items_all_isolation ON order_items
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY payments_all_isolation ON payments
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY tenant_domains_all_isolation ON tenant_domains
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY auth_sessions_all_isolation ON auth_sessions
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY conversations_all_isolation ON conversations
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY messages_all_isolation ON messages
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY credentials_all_isolation ON credentials
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY services_all_isolation ON services
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY billing_events_all_isolation ON billing_events
  FOR ALL
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY leads_select_isolation ON leads
  FOR SELECT
  USING ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY leads_update_isolation ON leads
  FOR UPDATE
  USING ("tenantId" = current_setting('app.tenant_id', true)::int)
  WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY leads_delete_isolation ON leads
  FOR DELETE
  USING ("tenantId" = current_setting('app.tenant_id', true)::int);

CREATE POLICY leads_insert_policy ON leads
  FOR INSERT
  WITH CHECK (
    "tenantId" IS NULL
    OR "tenantId" = current_setting('app.tenant_id', true)::int
  );
