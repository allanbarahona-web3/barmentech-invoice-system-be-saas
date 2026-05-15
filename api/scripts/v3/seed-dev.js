/* eslint-disable no-console */
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const url = process.env.DATABASE_URL_V3;

if (!url) {
  throw new Error('DATABASE_URL_V3 is required');
}

const SEED_TENANT_NAME = process.env.SEED_TENANT_NAME || 'BarmenTech Dev Tenant';
const SEED_TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'barmentech-dev';
const SEED_TENANT_DOMAIN = process.env.SEED_TENANT_DOMAIN || 'dev.barmentech.local';
const SEED_TENANT_EMAIL = process.env.SEED_TENANT_EMAIL || 'abarahonag@barmentech.com';
const SEED_SUPER_EMAIL = process.env.SEED_SUPER_EMAIL || 'admin@barmentech.com';
const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'admin123';
const SEED_COUNTRY_CODE = process.env.SEED_COUNTRY_CODE || 'CR';
const SEED_COUNTRY_PACK = process.env.SEED_COUNTRY_PACK || 'cr';

const prisma = new PrismaClient({ datasources: { db: { url } }, log: ['warn', 'error'] });

(async () => {
  const passwordHash = bcrypt.hashSync(SEED_DEFAULT_PASSWORD, 10);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.is_superadmin', 'true', false)`);

      await tx.$executeRawUnsafe(
        `INSERT INTO tenants (name, slug, country_code, country_pack, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active'::"TenantStatus", now(), now())
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           country_code = EXCLUDED.country_code,
           country_pack = EXCLUDED.country_pack,
           updated_at = now()`,
        SEED_TENANT_NAME,
        SEED_TENANT_SLUG,
        SEED_COUNTRY_CODE,
        SEED_COUNTRY_PACK,
      );

      const tenants = await tx.$queryRawUnsafe(
        `SELECT id FROM tenants WHERE slug = $1 LIMIT 1`,
        SEED_TENANT_SLUG,
      );
      const tenantId = Number(tenants[0].id);

      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_domains (
           tenant_id, domain, is_primary, verification_token, verified_at, is_active, created_at, updated_at
         ) VALUES ($1, $2, true, NULL, now(), true, now(), now())
         ON CONFLICT (domain) DO UPDATE SET
           tenant_id = EXCLUDED.tenant_id,
           is_primary = EXCLUDED.is_primary,
           verified_at = EXCLUDED.verified_at,
           is_active = EXCLUDED.is_active,
           updated_at = now()`,
        tenantId,
        SEED_TENANT_DOMAIN,
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_settings (
          id, tenant_id, currency, tax_enabled, tax_config_json,
          invoice_prefix, next_invoice_number,
          draft_prefix, next_draft_number,
          quote_prefix, next_quote_number,
          accepted_payment_methods_json, features_json,
          onboarding_completed, created_at, updated_at
        ) VALUES (
          $1, $2, 'CRC', true, '{}'::jsonb,
          'INV-', 1,
          'DRF-', 1,
          'COT-', 1,
          '["cash","bank_transfer","sinpe"]'::jsonb, '{}'::jsonb,
          true, now(), now()
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
          currency = EXCLUDED.currency,
          tax_enabled = EXCLUDED.tax_enabled,
          accepted_payment_methods_json = EXCLUDED.accepted_payment_methods_json,
          onboarding_completed = EXCLUDED.onboarding_completed,
          updated_at = now()`,
        randomUUID(),
        tenantId,
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO company_profiles (
          id, tenant_id, branding_json, legal_json, fiscal_base_json, fiscal_extensions_json, created_at, updated_at
        ) VALUES (
          $1, $2,
          '{"companyName":"BarmenTech","brandColor":"#0f766e"}'::jsonb,
          '{"legalName":"BarmenTech S.A.","taxId":"3-101-999999"}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb,
          now(), now()
        )
        ON CONFLICT (tenant_id) DO UPDATE SET
          branding_json = EXCLUDED.branding_json,
          legal_json = EXCLUDED.legal_json,
          updated_at = now()`,
        randomUUID(),
        tenantId,
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO tenant_users (
          id, tenant_id, email, password_hash, name, role, status, token_version, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, 'Tenant Admin', 'owner'::"TenantUserRole", 'active'::"UserStatus", 0, now(), now()
        )
        ON CONFLICT (tenant_id, email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = now()`,
        randomUUID(),
        tenantId,
        SEED_TENANT_EMAIL,
        passwordHash,
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO platform_users (
          id, email, password_hash, role, status, token_version, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'super_admin'::"PlatformUserRole", 'active'::"PlatformUserStatus", 0, now(), now()
        )
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = now()`,
        randomUUID(),
        SEED_SUPER_EMAIL,
        passwordHash,
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO customers (
          id, tenant_id, name, email, phone, id_number, address_json, notes, status, contact_preferences_json, created_at, updated_at
        ) VALUES
          ($1, $2, 'Cliente Demo 1', 'cliente1@demo.com', '8888-1111', NULL, '{}'::jsonb, 'Seed demo', 'active', '{"preferredChannel":"email","consentStatus":"granted","preferredTime":"morning","allowEmail":true,"allowWhatsApp":false}'::jsonb, now(), now()),
          ($3, $2, 'Cliente Demo 2', 'cliente2@demo.com', '8888-2222', NULL, '{}'::jsonb, 'Seed demo', 'active', '{"preferredChannel":"whatsapp","consentStatus":"granted","preferredTime":"afternoon","allowEmail":true,"allowWhatsApp":true}'::jsonb, now(), now())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          updated_at = now()`,
        randomUUID(),
        tenantId,
        randomUUID(),
      );

      await tx.$executeRawUnsafe(
        `INSERT INTO catalog_items (
          id, tenant_id, code, name, description, kind, unit_price, tax_profile_json, is_active, created_at, updated_at
        ) VALUES
          ($1, $2, 'SRV-001', 'Servicio Demo', 'Servicio para pruebas', 'service', 15000, '{}'::jsonb, true, now(), now()),
          ($3, $2, 'PRD-001', 'Producto Demo', 'Producto para pruebas', 'product', 9500, '{}'::jsonb, true, now(), now())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          unit_price = EXCLUDED.unit_price,
          is_active = EXCLUDED.is_active,
          updated_at = now()`,
        randomUUID(),
        tenantId,
        randomUUID(),
      );
    }, { timeout: 120000 });

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT count(*) FROM tenants) AS tenants,
        (SELECT count(*) FROM tenant_users) AS tenant_users,
        (SELECT count(*) FROM platform_users) AS platform_users,
        (SELECT count(*) FROM customers) AS customers,
        (SELECT count(*) FROM catalog_items) AS catalog_items;
    `);

    const normalized = Object.fromEntries(
      Object.entries(rows[0]).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]),
    );

    console.log('V3 dev seed completed:', normalized);
    console.log('Tenant login:', SEED_TENANT_EMAIL, SEED_DEFAULT_PASSWORD);
    console.log('Super login:', SEED_SUPER_EMAIL, SEED_DEFAULT_PASSWORD);
  } finally {
    await prisma.$disconnect();
  }
})();
