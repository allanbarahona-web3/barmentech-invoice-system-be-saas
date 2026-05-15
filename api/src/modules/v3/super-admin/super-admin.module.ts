import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { V3DbService } from '../v3-db.service';
import { SuperAdminAuthController } from './super-admin-auth.controller';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminJwtGuard } from './super-admin-jwt.guard';
import { SuperAdminJwtStrategy } from './super-admin-jwt.strategy';
import { SuperAdminTenantsController } from './super-admin-tenants.controller';
import { SuperAdminTenantsService } from './super-admin-tenants.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'platform-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'your-super-secret-jwt-key-change-this-in-production',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SuperAdminAuthController, SuperAdminTenantsController],
  providers: [
    V3DbService,
    SuperAdminAuthService,
    SuperAdminTenantsService,
    SuperAdminJwtStrategy,
    SuperAdminJwtGuard,
  ],
  exports: [SuperAdminAuthService, SuperAdminTenantsService],
})
export class SuperAdminModule {}
