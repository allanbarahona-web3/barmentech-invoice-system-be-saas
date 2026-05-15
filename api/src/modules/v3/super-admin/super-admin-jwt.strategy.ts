import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdminAuthService } from './super-admin-auth.service';

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(Strategy, 'platform-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly superAdminAuthService: SuperAdminAuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'your-super-secret-jwt-key-change-this-in-production',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: 'super_admin' | 'platform_admin';
    scope: 'platform';
    jti: string;
  }) {
    return this.superAdminAuthService.validateAccess(payload);
  }
}
