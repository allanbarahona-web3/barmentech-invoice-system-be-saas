import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Get tenant ID from JWT payload (set by JwtStrategy)
    const tenantId = (req.user as any)?.tenantId || req.tenantIdFromHost;

    if (tenantId) {
      // Set the tenant context for PostgreSQL RLS
      try {
        await this.prisma.$executeRawUnsafe(
          `SELECT set_config('app.tenant_id', $1, false)`,
          String(tenantId),
        );
      } catch (error) {
        console.error('Failed to set tenant context:', error);
        // Continue anyway, but RLS might not work properly
      }
    }

    next();
  }
}
