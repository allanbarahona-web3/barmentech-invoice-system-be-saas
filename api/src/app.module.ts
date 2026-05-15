import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantUsersModule } from './modules/tenant-users/tenant-users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TenantDomainsModule } from './modules/tenant-domains/tenant-domains.module';
import { EmailModule } from './modules/email/email.module';
import { MediaModule } from './modules/media/media.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CrmModule } from './modules/crm/crm.module';
import { LeadsModule } from './modules/leads/leads.module';
import { FiscalCoreModule } from './modules/fiscal-core/fiscal-core.module';
import { V3CompatModule } from './modules/v3/v3-compat.module';
import { HostExtractionMiddleware } from './common/middleware/host-extraction.middleware';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

@Module({
  imports: [
    // Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 🚨 Rate Limiting / Throttling
    // Global rate limit: 100 requests per 60 seconds
    // Can be overridden per endpoint with @Throttle() decorator
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time window in milliseconds (60 seconds)
        limit: 100, // Max requests per window
      },
    ]),

    // Prisma para acceso a base de datos
    PrismaModule,

    // Common (guards, decorators, services globales)
    CommonModule,

    // Módulos de negocio
    AuthModule,
    TenantsModule,
    TenantUsersModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    TenantDomainsModule,
    EmailModule,
    MediaModule,
    CategoriesModule,
    CrmModule,
    LeadsModule,
    FiscalCoreModule,
    V3CompatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      // 1️⃣ First: Extract tenantId from domain
      .apply(HostExtractionMiddleware)
      .forRoutes('*')

      // 2️⃣ Second: Set tenant context for RLS
      .apply(TenantContextMiddleware)
      .forRoutes('*');
  }
}
