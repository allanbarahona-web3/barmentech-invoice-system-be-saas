import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { V3DbService } from '../v3-db.service';

@Injectable()
export class SuperAdminTenantsService {
  constructor(private readonly v3DbService: V3DbService) {}

  async listTenants() {
    return this.v3DbService.withSuperAdmin(async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: number;
        name: string;
        slug: string;
        countryCode: string | null;
        countryPack: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }>>(Prisma.sql`
        SELECT
          id,
          name,
          slug,
          country_code AS "countryCode",
          country_pack AS "countryPack",
          status::text AS status,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM tenants
        ORDER BY created_at DESC
      `);

      return rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    });
  }

  async suspendTenant(tenantId: number, actorUserId: string, reason?: string) {
    return this.v3DbService.withSuperAdmin(async (tx) => {
      const existing = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id FROM tenants WHERE id = ${tenantId} LIMIT 1
      `);

      if (!existing[0]) {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE tenants
        SET
          status = 'suspended'::"TenantStatus",
          suspension_reason = ${reason || null},
          suspended_at = now(),
          suspended_by_platform_user_id = ${actorUserId},
          updated_at = now()
        WHERE id = ${tenantId}
      `);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO platform_audit_events (
          id,
          platform_user_id,
          action,
          target_type,
          target_id,
          meta_json,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${actorUserId},
          'TENANT_SUSPENDED',
          'tenant',
          ${String(tenantId)},
          ${reason ? { reason } : null},
          now()
        )
      `);

      return { success: true };
    });
  }

  async activateTenant(tenantId: number, actorUserId: string) {
    return this.v3DbService.withSuperAdmin(async (tx) => {
      const existing = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id FROM tenants WHERE id = ${tenantId} LIMIT 1
      `);

      if (!existing[0]) {
        throw new NotFoundException(`Tenant ${tenantId} not found`);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE tenants
        SET
          status = 'active'::"TenantStatus",
          suspension_reason = null,
          suspended_at = null,
          suspended_by_platform_user_id = null,
          updated_at = now()
        WHERE id = ${tenantId}
      `);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO platform_audit_events (
          id,
          platform_user_id,
          action,
          target_type,
          target_id,
          meta_json,
          created_at
        ) VALUES (
          gen_random_uuid(),
          ${actorUserId},
          'TENANT_ACTIVATED',
          'tenant',
          ${String(tenantId)},
          null,
          now()
        )
      `);

      return { success: true };
    });
  }
}
