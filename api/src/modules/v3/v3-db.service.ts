import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class V3DbService implements OnModuleInit, OnModuleDestroy {
  private client?: PrismaClient;

  private getClient(): PrismaClient {
    if (!this.client) {
      const url = process.env.DATABASE_URL_V3;
      if (!url) {
        throw new ServiceUnavailableException(
          'DATABASE_URL_V3 is not configured. Create and configure the new V3 database before enabling V3 endpoints.',
        );
      }

      this.client = new PrismaClient({
        datasources: {
          db: { url },
        },
        log: ['warn', 'error'],
      });
    }

    return this.client;
  }

  async onModuleInit() {
    if (process.env.DATABASE_URL_V3) {
      await this.getClient().$connect();
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.$disconnect();
    }
  }

  async withTenant<T>(
    tenantId: number,
    callback: (tx: PrismaClient) => Promise<T>,
  ): Promise<T> {
    const client = this.getClient();

    return client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.tenant_id', $1::text, false)`,
        String(tenantId),
      );

      return callback(tx as PrismaClient);
    });
  }

  async withSuperAdmin<T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> {
    const client = this.getClient();

    return client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.is_superadmin', 'true', false)`,
      );

      return callback(tx as PrismaClient);
    });
  }
}
