/* eslint-disable no-console */
const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');

const oldUrl = process.env.DATABASE_URL;
const newUrl = process.env.DATABASE_URL_V3;

if (!oldUrl) {
  throw new Error('DATABASE_URL is required to read source data from old DB');
}

if (!newUrl) {
  throw new Error('DATABASE_URL_V3 is required to write data into V3 DB');
}

const oldDb = new PrismaClient({ datasources: { db: { url: oldUrl } }, log: ['warn', 'error'] });
const newDb = new PrismaClient({ datasources: { db: { url: newUrl } }, log: ['warn', 'error'] });

function mapRole(role) {
  if (role === 'owner' || role === 'manager' || role === 'staff') return role;
  if (role === 'admin') return 'owner';
  return 'staff';
}

function mapUserStatus(status) {
  if (status === 'inactive' || status === 'suspended') return status;
  return 'active';
}

function mapTenantStatus(status) {
  if (status === 'suspended' || status === 'trial' || status === 'cancelled') return status;
  return 'active';
}

async function getColumns(db, table) {
  const rows = await db.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    table,
  );
  return new Set(rows.map((r) => r.column_name));
}

function oldExpr(columns, dbColumn, alias, fallbackSql) {
  if (columns.has(dbColumn)) {
    return `"${dbColumn}" AS "${alias}"`;
  }
  return `${fallbackSql} AS "${alias}"`;
}

function nullableText(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function toDate(v) {
  if (!v) return new Date();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function fetchLegacyData() {
  const [tenantCols, tenantUserCols, tenantDomainCols, customerCols, productCols] = await Promise.all([
    getColumns(oldDb, 'tenants'),
    getColumns(oldDb, 'tenant_users'),
    getColumns(oldDb, 'tenant_domains'),
    getColumns(oldDb, 'customers'),
    getColumns(oldDb, 'products'),
  ]);

  const tenants = await oldDb.$queryRawUnsafe(`
    SELECT
      ${oldExpr(tenantCols, 'id', 'id', '0')},
      ${oldExpr(tenantCols, 'name', 'name', "'Unknown Tenant'::text")},
      ${oldExpr(tenantCols, 'slug', 'slug', "('tenant-' || floor(random()*1000000)::int)::text")},
      ${oldExpr(tenantCols, 'country_code', 'countryCode', 'NULL::text')},
      ${oldExpr(tenantCols, 'country_pack', 'countryPack', 'NULL::text')},
      ${oldExpr(tenantCols, 'status', 'status', "'active'::text")},
      ${oldExpr(tenantCols, 'createdAt', 'createdAt', 'now()')},
      ${oldExpr(tenantCols, 'updatedAt', 'updatedAt', 'now()')}
    FROM tenants
    ORDER BY "id" ASC
  `);

  const tenantUsers = await oldDb.$queryRawUnsafe(`
    SELECT
      ${oldExpr(tenantUserCols, 'id', 'id', 'gen_random_uuid()')},
      ${oldExpr(tenantUserCols, 'tenantId', 'tenantId', 'NULL::int')},
      ${oldExpr(tenantUserCols, 'email', 'email', "''::text")},
      ${oldExpr(tenantUserCols, 'passwordHash', 'passwordHash', "''::text")},
      ${oldExpr(tenantUserCols, 'name', 'name', "'Unknown User'::text")},
      ${oldExpr(tenantUserCols, 'role', 'role', "'staff'::text")},
      ${oldExpr(tenantUserCols, 'status', 'status', "'active'::text")},
      ${oldExpr(tenantUserCols, 'tokenVersion', 'tokenVersion', '0')},
      ${oldExpr(tenantUserCols, 'createdAt', 'createdAt', 'now()')},
      ${oldExpr(tenantUserCols, 'updatedAt', 'updatedAt', 'now()')}
    FROM tenant_users
  `);

  const tenantDomains = await oldDb.$queryRawUnsafe(`
    SELECT
      ${oldExpr(tenantDomainCols, 'tenantId', 'tenantId', 'NULL::int')},
      ${oldExpr(tenantDomainCols, 'domain', 'domain', "''::text")},
      ${oldExpr(tenantDomainCols, 'isPrimary', 'isPrimary', 'true')},
      ${oldExpr(tenantDomainCols, 'verificationToken', 'verificationToken', 'NULL::text')},
      ${oldExpr(tenantDomainCols, 'verifiedAt', 'verifiedAt', 'NULL::timestamp')},
      ${oldExpr(tenantDomainCols, 'isActive', 'isActive', 'true')},
      ${oldExpr(tenantDomainCols, 'createdAt', 'createdAt', 'now()')},
      ${oldExpr(tenantDomainCols, 'updatedAt', 'updatedAt', 'now()')}
    FROM tenant_domains
  `);

  const customers = await oldDb.$queryRawUnsafe(`
    SELECT
      ${oldExpr(customerCols, 'id', 'id', 'gen_random_uuid()')},
      ${oldExpr(customerCols, 'tenantId', 'tenantId', 'NULL::int')},
      ${oldExpr(customerCols, 'name', 'name', "'Unknown Customer'::text")},
      ${oldExpr(customerCols, 'email', 'email', 'NULL::text')},
      ${oldExpr(customerCols, 'phone', 'phone', 'NULL::text')},
      ${oldExpr(customerCols, 'status', 'status', "'active'::text")},
      ${oldExpr(customerCols, 'createdAt', 'createdAt', 'now()')},
      ${oldExpr(customerCols, 'updatedAt', 'updatedAt', 'now()')}
    FROM customers
  `);

  const products = await oldDb.$queryRawUnsafe(`
    SELECT
      ${oldExpr(productCols, 'id', 'id', 'gen_random_uuid()')},
      ${oldExpr(productCols, 'tenantId', 'tenantId', 'NULL::int')},
      ${oldExpr(productCols, 'slug', 'slug', 'NULL::text')},
      ${oldExpr(productCols, 'name', 'name', "'Unnamed Item'::text")},
      ${oldExpr(productCols, 'description', 'description', 'NULL::text')},
      ${oldExpr(productCols, 'productKind', 'productKind', "'physical'::text")},
      ${oldExpr(productCols, 'isActive', 'isActive', 'true')},
      ${oldExpr(productCols, 'price', 'price', '0')},
      ${oldExpr(productCols, 'createdAt', 'createdAt', 'now()')},
      ${oldExpr(productCols, 'updatedAt', 'updatedAt', 'now()')}
    FROM products
  `);

  return { tenants, tenantUsers, tenantDomains, customers, products };
}

async function migrateData() {
  const { tenants, tenantUsers, tenantDomains, customers, products } = await fetchLegacyData();

  await newDb.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_superadmin', 'true', false)`);

    for (const t of tenants) {
      if (!t.id) continue;

      const tenantId = Number(t.id);
      const tenantSlug = nullableText(t.slug) || `tenant-${tenantId}`;

      await tx.$executeRawUnsafe(
        `INSERT INTO tenants (id, name, slug, country_code, country_pack, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::"TenantStatus", $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           country_code = EXCLUDED.country_code,
           country_pack = EXCLUDED.country_pack,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
        tenantId,
        nullableText(t.name) || `Tenant ${tenantId}`,
        tenantSlug,
        nullableText(t.countryCode),
        nullableText(t.countryPack),
        mapTenantStatus(nullableText(t.status) || 'active'),
        toDate(t.createdAt),
        toDate(t.updatedAt),
      );

      const defaultCurrency = (nullableText(t.countryCode) || '').toUpperCase() === 'CR' ? 'CRC' : 'USD';
      const prefixBase = tenantSlug.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'INV';

      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_settings (
            id, tenant_id, currency, tax_enabled, invoice_prefix, next_invoice_number,
            draft_prefix, next_draft_number, quote_prefix, next_quote_number,
            accepted_payment_methods_json, features_json,
            onboarding_completed, created_at, updated_at
         ) VALUES (
            $1, $2, $3, true, $4, 1,
            'DRF-', 1, 'COT-', 1,
            '[]'::jsonb, '{}'::jsonb,
            false, now(), now()
         )
         ON CONFLICT (tenant_id) DO NOTHING`,
        randomUUID(),
        tenantId,
        defaultCurrency,
        `${prefixBase}-`,
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO company_profiles (
            id, tenant_id, branding_json, legal_json, fiscal_base_json, fiscal_extensions_json, created_at, updated_at
         ) VALUES (
            $1, $2, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, now(), now()
         )
         ON CONFLICT (tenant_id) DO NOTHING`,
        randomUUID(),
        tenantId,
      );
    }

    for (const u of tenantUsers) {
      if (!u.id || !u.tenantId) continue;

      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_users (
           id, tenant_id, email, password_hash, name, role, status, token_version, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6::"TenantUserRole", $7::"UserStatus", $8, $9, $10
         )
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           status = EXCLUDED.status,
           token_version = EXCLUDED.token_version,
           updated_at = EXCLUDED.updated_at`,
        String(u.id),
        Number(u.tenantId),
        nullableText(u.email) || `legacy-${u.id}@example.com`,
        nullableText(u.passwordHash) || 'legacy-missing-password-hash',
        nullableText(u.name) || 'Legacy User',
        mapRole(nullableText(u.role) || 'staff'),
        mapUserStatus(nullableText(u.status) || 'active'),
        Number(u.tokenVersion || 0),
        toDate(u.createdAt),
        toDate(u.updatedAt),
      );
    }

    for (const d of tenantDomains) {
      if (!d.tenantId || !nullableText(d.domain)) continue;

      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_domains (
          tenant_id, domain, is_primary, verification_token, verified_at, is_active, created_at, updated_at
         ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
         )
         ON CONFLICT (domain) DO UPDATE SET
           tenant_id = EXCLUDED.tenant_id,
           is_primary = EXCLUDED.is_primary,
           verification_token = EXCLUDED.verification_token,
           verified_at = EXCLUDED.verified_at,
           is_active = EXCLUDED.is_active,
           updated_at = EXCLUDED.updated_at`,
        Number(d.tenantId),
        nullableText(d.domain),
        Boolean(d.isPrimary ?? true),
        nullableText(d.verificationToken),
        d.verifiedAt ? toDate(d.verifiedAt) : null,
        Boolean(d.isActive ?? true),
        toDate(d.createdAt),
        toDate(d.updatedAt),
      );
    }

    for (const c of customers) {
      if (!c.id || !c.tenantId) continue;

      await tx.$executeRawUnsafe(
        `INSERT INTO customers (
          id, tenant_id, name, email, phone, id_number, address_json, notes, status, contact_preferences_json, created_at, updated_at
         ) VALUES (
          $1, $2, $3, $4, $5, NULL, '{}'::jsonb, NULL, $6, '{"preferredChannel":"unspecified","consentStatus":"unknown","preferredTime":"any","allowEmail":true,"allowWhatsApp":true}'::jsonb, $7, $8
         )
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           phone = EXCLUDED.phone,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at`,
        String(c.id),
        Number(c.tenantId),
        nullableText(c.name) || 'Legacy Customer',
        nullableText(c.email),
        nullableText(c.phone),
        nullableText(c.status) || 'active',
        toDate(c.createdAt),
        toDate(c.updatedAt),
      );
    }

    for (const p of products) {
      if (!p.id || !p.tenantId) continue;

      await tx.$executeRawUnsafe(
        `INSERT INTO catalog_items (
          id, tenant_id, code, name, description, kind, unit_price, tax_profile_json, is_active, created_at, updated_at
         ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, '{}'::jsonb, $8, $9, $10
         )
         ON CONFLICT (id) DO UPDATE SET
           code = EXCLUDED.code,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           kind = EXCLUDED.kind,
           unit_price = EXCLUDED.unit_price,
           is_active = EXCLUDED.is_active,
           updated_at = EXCLUDED.updated_at`,
        String(p.id),
        Number(p.tenantId),
        nullableText(p.slug),
        nullableText(p.name) || 'Legacy Item',
        nullableText(p.description),
        nullableText(p.productKind) === 'digital' ? 'service' : 'product',
        Math.round(Number(p.price || 0)),
        Boolean(p.isActive ?? true),
        toDate(p.createdAt),
        toDate(p.updatedAt),
      );
    }
  }, { timeout: 600000 });
}

async function verifySummary() {
  const summary = await newDb.$queryRawUnsafe(`
    SELECT
      (SELECT count(*) FROM tenants) AS tenants,
      (SELECT count(*) FROM tenant_users) AS tenant_users,
      (SELECT count(*) FROM tenant_domains) AS tenant_domains,
      (SELECT count(*) FROM tenant_settings) AS tenant_settings,
      (SELECT count(*) FROM company_profiles) AS company_profiles,
      (SELECT count(*) FROM customers) AS customers,
      (SELECT count(*) FROM catalog_items) AS catalog_items,
      (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN (
        'tenant_users','auth_sessions','tenant_domains','tenant_settings','company_profiles','customers','catalog_items','commercial_documents','commercial_document_items','commercial_document_events','document_receipts','document_receipt_allocations','fiscal_documents','fiscal_document_events','fiscal_jobs','expenses','billing_events'
      )) AS rls_policies;
  `);

  const row = summary[0];
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value]),
  );

  console.log('V3 bootstrap and verification summary:', normalized);
}

(async () => {
  try {
    await migrateData();
    await verifySummary();
  } finally {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  }
})();
