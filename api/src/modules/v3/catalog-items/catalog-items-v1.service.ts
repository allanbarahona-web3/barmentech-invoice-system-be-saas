import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { FeProductCompat } from '../contracts/fe-compatibility.contract';
import { V3DbService } from '../v3-db.service';

interface CatalogItemRow {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  kind: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CatalogItemsV1Service {
  constructor(private readonly v3DbService: V3DbService) {}

  async list(tenantId: number): Promise<FeProductCompat[]> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<CatalogItemRow[]>(Prisma.sql`
        SELECT
          id,
          code,
          name,
          description,
          kind,
          unit_price AS "unitPrice",
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM catalog_items
        ORDER BY created_at DESC
      `);

      return rows.map((row) => this.mapRowToFe(row));
    });
  }

  async getById(tenantId: number, id: string): Promise<FeProductCompat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const row = await this.findRowById(tx, id);
      if (!row) throw new NotFoundException(`Catalog item with id ${id} not found`);
      return this.mapRowToFe(row);
    });
  }

  async create(
    tenantId: number,
    input: Partial<FeProductCompat>,
  ): Promise<FeProductCompat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const createdRows = await tx.$queryRaw<CatalogItemRow[]>(Prisma.sql`
        INSERT INTO catalog_items (
          tenant_id,
          code,
          name,
          description,
          kind,
          unit_price,
          is_active
        )
        VALUES (
          ${tenantId},
          ${input.sku || null},
          ${input.name || 'Unnamed item'},
          ${input.description || null},
          ${input.type === 'service' ? 'service' : 'product'},
          ${Math.round(input.price || 0)},
          ${input.status ? input.status === 'active' : true}
        )
        RETURNING
          id,
          code,
          name,
          description,
          kind,
          unit_price AS "unitPrice",
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      return this.mapRowToFe(createdRows[0]);
    });
  }

  async update(
    tenantId: number,
    id: string,
    input: Partial<FeProductCompat>,
  ): Promise<FeProductCompat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const existing = await this.findRowById(tx, id);
      if (!existing) throw new NotFoundException(`Catalog item with id ${id} not found`);

      const updatedRows = await tx.$queryRaw<CatalogItemRow[]>(Prisma.sql`
        UPDATE catalog_items
        SET
          code = ${input.sku ?? existing.code},
          name = ${input.name ?? existing.name},
          description = ${input.description ?? existing.description},
          kind = ${input.type ? (input.type === 'service' ? 'service' : 'product') : existing.kind},
          unit_price = ${Math.round(input.price ?? existing.unitPrice)},
          is_active = ${input.status ? input.status === 'active' : existing.isActive},
          updated_at = now()
        WHERE id = ${id}
        RETURNING
          id,
          code,
          name,
          description,
          kind,
          unit_price AS "unitPrice",
          is_active AS "isActive",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      return this.mapRowToFe(updatedRows[0]);
    });
  }

  async remove(tenantId: number, id: string): Promise<void> {
    await this.v3DbService.withTenant(tenantId, async (tx) => {
      const existing = await this.findRowById(tx, id);
      if (!existing) throw new NotFoundException(`Catalog item with id ${id} not found`);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM catalog_items
        WHERE id = ${id}
      `);
    });
  }

  private async findRowById(
    tx: PrismaClient,
    id: string,
  ): Promise<CatalogItemRow | null> {
    const rows = await tx.$queryRaw<CatalogItemRow[]>(Prisma.sql`
      SELECT
        id,
        code,
        name,
        description,
        kind,
        unit_price AS "unitPrice",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM catalog_items
      WHERE id = ${id}
      LIMIT 1
    `);

    return rows[0] || null;
  }

  private mapRowToFe(row: CatalogItemRow): FeProductCompat {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      sku: row.code || undefined,
      price: row.unitPrice,
      type: row.kind === 'service' ? 'service' : 'product',
      status: row.isActive ? 'active' : 'inactive',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
