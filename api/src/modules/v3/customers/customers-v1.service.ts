import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { FeCustomerCompat } from '../contracts/fe-compatibility.contract';
import { V3DbService } from '../v3-db.service';

interface CustomerRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  idNumber: string | null;
  address: Record<string, unknown> | null;
  notes: string | null;
  status: string;
  contactPreferences: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CustomersV1Service {
  constructor(private readonly v3DbService: V3DbService) {}

  async list(tenantId: number): Promise<FeCustomerCompat[]> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const rows = await tx.$queryRaw<CustomerRow[]>(Prisma.sql`
        SELECT
          id,
          name,
          email,
          phone,
          id_number AS "idNumber",
          address_json AS address,
          notes,
          status,
          contact_preferences_json AS "contactPreferences",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM customers
        ORDER BY created_at DESC
      `);

      return rows.map((row) => this.mapRowToFe(row));
    });
  }

  async getById(tenantId: number, id: string): Promise<FeCustomerCompat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const row = await this.findRowById(tx, id);
      if (!row) throw new NotFoundException(`Customer with id ${id} not found`);
      return this.mapRowToFe(row);
    });
  }

  async create(
    tenantId: number,
    input: Partial<FeCustomerCompat>,
  ): Promise<FeCustomerCompat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const createdRows = await tx.$queryRaw<CustomerRow[]>(Prisma.sql`
        INSERT INTO customers (
          tenant_id,
          name,
          email,
          phone,
          id_number,
          address_json,
          notes,
          status,
          contact_preferences_json
        )
        VALUES (
          ${tenantId},
          ${input.name || 'Unnamed customer'},
          ${input.email || null},
          ${input.phone || null},
          ${input.idNumber || null},
          ${this.mapAddressToJson(input) || null},
          ${input.notes || null},
          ${input.status || 'active'},
          ${this.mapContactPreferencesToJson(input.contactPreferences) || null}
        )
        RETURNING
          id,
          name,
          email,
          phone,
          id_number AS "idNumber",
          address_json AS address,
          notes,
          status,
          contact_preferences_json AS "contactPreferences",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      return this.mapRowToFe(createdRows[0]);
    });
  }

  async update(
    tenantId: number,
    id: string,
    input: Partial<FeCustomerCompat>,
  ): Promise<FeCustomerCompat> {
    return this.v3DbService.withTenant(tenantId, async (tx) => {
      const existing = await this.findRowById(tx, id);
      if (!existing) throw new NotFoundException(`Customer with id ${id} not found`);

      const nextAddress = {
        country: input.country ?? this.readAddress(existing, 'country'),
        state: input.state ?? this.readAddress(existing, 'state'),
        city: input.city ?? this.readAddress(existing, 'city'),
        zipCode: input.zipCode ?? this.readAddress(existing, 'zipCode'),
        addressDetail: input.addressDetail ?? this.readAddress(existing, 'addressDetail'),
      };

      const nextContactPreferences = {
        preferredChannel:
          input.contactPreferences?.preferredChannel ||
          this.readContactPreference(existing, 'preferredChannel') ||
          'unspecified',
        consentStatus:
          input.contactPreferences?.consentStatus ||
          this.readContactPreference(existing, 'consentStatus') ||
          'unknown',
        preferredTime:
          input.contactPreferences?.preferredTime ||
          this.readContactPreference(existing, 'preferredTime') ||
          'any',
        allowEmail:
          input.contactPreferences?.allowEmail ??
          this.readContactPreference(existing, 'allowEmail') ??
          true,
        allowWhatsApp:
          input.contactPreferences?.allowWhatsApp ??
          this.readContactPreference(existing, 'allowWhatsApp') ??
          true,
      };

      const updatedRows = await tx.$queryRaw<CustomerRow[]>(Prisma.sql`
        UPDATE customers
        SET
          name = ${input.name ?? existing.name},
          email = ${input.email ?? existing.email},
          phone = ${input.phone ?? existing.phone},
          id_number = ${input.idNumber ?? existing.idNumber},
          notes = ${input.notes ?? existing.notes},
          status = ${input.status ?? existing.status},
          address_json = ${nextAddress},
          contact_preferences_json = ${nextContactPreferences},
          updated_at = now()
        WHERE id = ${id}
        RETURNING
          id,
          name,
          email,
          phone,
          id_number AS "idNumber",
          address_json AS address,
          notes,
          status,
          contact_preferences_json AS "contactPreferences",
          created_at AS "createdAt",
          updated_at AS "updatedAt"
      `);

      return this.mapRowToFe(updatedRows[0]);
    });
  }

  async remove(tenantId: number, id: string): Promise<void> {
    await this.v3DbService.withTenant(tenantId, async (tx) => {
      const existing = await this.findRowById(tx, id);
      if (!existing) throw new NotFoundException(`Customer with id ${id} not found`);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM customers
        WHERE id = ${id}
      `);
    });
  }

  private async findRowById(
    tx: PrismaClient,
    id: string,
  ): Promise<CustomerRow | null> {
    const rows = await tx.$queryRaw<CustomerRow[]>(Prisma.sql`
      SELECT
        id,
        name,
        email,
        phone,
        id_number AS "idNumber",
        address_json AS address,
        notes,
        status,
        contact_preferences_json AS "contactPreferences",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM customers
      WHERE id = ${id}
      LIMIT 1
    `);

    return rows[0] || null;
  }

  private mapRowToFe(row: CustomerRow): FeCustomerCompat {
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      idNumber: row.idNumber || undefined,
      country: this.readAddress(row, 'country') || undefined,
      state: this.readAddress(row, 'state') || undefined,
      city: this.readAddress(row, 'city') || undefined,
      zipCode: this.readAddress(row, 'zipCode') || undefined,
      addressDetail: this.readAddress(row, 'addressDetail') || undefined,
      address: this.readAddress(row, 'address') || undefined,
      notes: row.notes || undefined,
      status: row.status === 'inactive' ? 'inactive' : 'active',
      contactPreferences: {
        preferredChannel:
          (this.readContactPreference(row, 'preferredChannel') as
            | 'whatsapp'
            | 'email'
            | 'phone'
            | 'unspecified') || 'unspecified',
        consentStatus:
          (this.readContactPreference(row, 'consentStatus') as
            | 'unknown'
            | 'granted'
            | 'denied') || 'unknown',
        preferredTime:
          (this.readContactPreference(row, 'preferredTime') as
            | 'any'
            | 'morning'
            | 'afternoon'
            | 'evening') || 'any',
        allowEmail: Boolean(this.readContactPreference(row, 'allowEmail') ?? true),
        allowWhatsApp: Boolean(this.readContactPreference(row, 'allowWhatsApp') ?? true),
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private mapAddressToJson(
    input: Partial<FeCustomerCompat>,
  ): Record<string, string> | undefined {
    if (!input.country && !input.state && !input.city && !input.zipCode && !input.addressDetail && !input.address) {
      return undefined;
    }

    return {
      country: input.country || '',
      state: input.state || '',
      city: input.city || '',
      zipCode: input.zipCode || '',
      addressDetail: input.addressDetail || '',
      address: input.address || '',
    };
  }

  private mapContactPreferencesToJson(
    input?: FeCustomerCompat['contactPreferences'],
  ): Record<string, unknown> | undefined {
    if (!input) return undefined;

    return {
      preferredChannel: input.preferredChannel,
      consentStatus: input.consentStatus,
      preferredTime: input.preferredTime,
      allowEmail: input.allowEmail,
      allowWhatsApp: input.allowWhatsApp,
    };
  }

  private readAddress(row: CustomerRow, key: string): string {
    if (!row.address || typeof row.address !== 'object') return '';
    const value = row.address[key];
    return typeof value === 'string' ? value : '';
  }

  private readContactPreference(row: CustomerRow, key: string): unknown {
    if (!row.contactPreferences || typeof row.contactPreferences !== 'object') {
      return undefined;
    }
    return row.contactPreferences[key];
  }
}
