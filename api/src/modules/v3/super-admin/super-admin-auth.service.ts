import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';
import { V3DbService } from '../v3-db.service';

interface PlatformJwtPayload {
  sub: string;
  email: string;
  role: 'super_admin' | 'platform_admin';
  scope: 'platform';
  jti: string;
  tokenVersion?: number;
}

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly v3DbService: V3DbService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string, ip?: string, userAgent?: string) {
    return this.v3DbService.withSuperAdmin(async (tx) => {
      const users = await tx.$queryRaw<Array<{
        id: string;
        email: string;
        passwordHash: string;
        role: 'super_admin' | 'platform_admin';
        status: 'active' | 'inactive';
        tokenVersion: number;
      }>>(Prisma.sql`
        SELECT
          id,
          email,
          password_hash AS "passwordHash",
          role::text AS role,
          status::text AS status,
          token_version AS "tokenVersion"
        FROM platform_users
        WHERE email = ${email}
        LIMIT 1
      `);

      const user = users[0];
      if (!user) throw new UnauthorizedException('Invalid credentials');
      if (user.status !== 'active') {
        throw new UnauthorizedException('User is not active');
      }

      const passwordOk = await bcrypt.compare(password, user.passwordHash);
      if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

      const { accessToken, refreshToken, jti } = this.buildTokens(user);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO platform_sessions (
          id,
          platform_user_id,
          jti,
          refresh_token,
          access_token_jti,
          is_revoked,
          expires_at,
          created_at,
          last_used_at
        ) VALUES (
          ${randomUUID()},
          ${user.id},
          ${jti},
          ${refreshToken},
          ${jti},
          false,
          now() + interval '7 day',
          now(),
          now()
        )
      `);

      await this.registerAuditEvent(tx, user.id, 'LOGIN_SUCCESS', {
        ip: ip || '',
        userAgent: userAgent || '',
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    });
  }

  async refreshAccessToken(refreshToken: string) {
    let payload: PlatformJwtPayload;

    try {
      payload = this.jwtService.verify<PlatformJwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.scope !== 'platform') {
      throw new UnauthorizedException('Invalid token scope');
    }

    return this.v3DbService.withSuperAdmin(async (tx) => {
      const sessions = await tx.$queryRaw<Array<{
        id: string;
        platformUserId: string;
        isRevoked: boolean;
        expiresAt: Date;
      }>>(Prisma.sql`
        SELECT
          id,
          platform_user_id AS "platformUserId",
          is_revoked AS "isRevoked",
          expires_at AS "expiresAt"
        FROM platform_sessions
        WHERE refresh_token = ${refreshToken}
        LIMIT 1
      `);

      const session = sessions[0];
      if (!session || session.isRevoked) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (new Date() > session.expiresAt) {
        throw new UnauthorizedException('Refresh token expired');
      }

      const users = await tx.$queryRaw<Array<{
        id: string;
        email: string;
        role: 'super_admin' | 'platform_admin';
        status: 'active' | 'inactive';
        tokenVersion: number;
      }>>(Prisma.sql`
        SELECT
          id,
          email,
          role::text AS role,
          status::text AS status,
          token_version AS "tokenVersion"
        FROM platform_users
        WHERE id = ${session.platformUserId}
        LIMIT 1
      `);

      const user = users[0];
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const jti = randomUUID();
      const accessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          scope: 'platform',
          jti,
        },
        { expiresIn: '15m' },
      );

      await tx.$executeRaw(Prisma.sql`
        UPDATE platform_sessions
        SET access_token_jti = ${jti}, last_used_at = now()
        WHERE id = ${session.id}
      `);

      return { accessToken };
    });
  }

  async logout(userId: string, refreshToken: string) {
    await this.v3DbService.withSuperAdmin(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE platform_sessions
        SET is_revoked = true, last_used_at = now()
        WHERE platform_user_id = ${userId}
          AND refresh_token = ${refreshToken}
      `);

      await this.registerAuditEvent(tx, userId, 'LOGOUT', {
        session: 'single',
      });
    });

    return { success: true };
  }

  async revokeAllSessions(userId: string) {
    await this.v3DbService.withSuperAdmin(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE platform_users
        SET token_version = token_version + 1, updated_at = now()
        WHERE id = ${userId}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE platform_sessions
        SET is_revoked = true, last_used_at = now()
        WHERE platform_user_id = ${userId}
      `);

      await this.registerAuditEvent(tx, userId, 'REVOKE_ALL_SESSIONS', {
        reason: 'manual',
      });
    });

    return { success: true };
  }

  async validateAccess(payload: PlatformJwtPayload) {
    if (payload.scope !== 'platform') {
      throw new UnauthorizedException('Invalid token scope');
    }

    return this.v3DbService.withSuperAdmin(async (tx) => {
      const users = await tx.$queryRaw<Array<{
        id: string;
        email: string;
        role: 'super_admin' | 'platform_admin';
        status: 'active' | 'inactive';
      }>>(Prisma.sql`
        SELECT
          id,
          email,
          role::text AS role,
          status::text AS status
        FROM platform_users
        WHERE id = ${payload.sub}
        LIMIT 1
      `);

      const user = users[0];
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      const sessions = await tx.$queryRaw<Array<{ id: string; isRevoked: boolean }>>(Prisma.sql`
        SELECT
          id,
          is_revoked AS "isRevoked"
        FROM platform_sessions
        WHERE platform_user_id = ${payload.sub}
          AND access_token_jti = ${payload.jti}
        LIMIT 1
      `);

      const session = sessions[0];
      if (!session || session.isRevoked) {
        throw new UnauthorizedException('Session revoked');
      }

      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        scope: 'platform',
        jti: payload.jti,
      };
    });
  }

  async getProfile(userId: string) {
    return this.v3DbService.withSuperAdmin(async (tx) => {
      const rows = await tx.$queryRaw<Array<{
        id: string;
        email: string;
        role: 'super_admin' | 'platform_admin';
        status: 'active' | 'inactive';
        createdAt: Date;
      }>>(Prisma.sql`
        SELECT
          id,
          email,
          role::text AS role,
          status::text AS status,
          created_at AS "createdAt"
        FROM platform_users
        WHERE id = ${userId}
        LIMIT 1
      `);

      const row = rows[0];
      if (!row) throw new UnauthorizedException('User not found');

      return {
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      };
    });
  }

  private buildTokens(user: {
    id: string;
    email: string;
    role: 'super_admin' | 'platform_admin';
    tokenVersion: number;
  }) {
    const jti = randomUUID();

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        scope: 'platform',
        jti,
      },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        scope: 'platform',
        jti,
        tokenVersion: user.tokenVersion,
      },
      { expiresIn: '7d' },
    );

    return { accessToken, refreshToken, jti };
  }

  private async registerAuditEvent(
    tx: PrismaClient,
    platformUserId: string,
    action: string,
    meta?: Record<string, string>,
  ) {
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
        ${randomUUID()},
        ${platformUserId},
        ${action},
        'auth',
        ${platformUserId},
        ${meta ?? null},
        now()
      )
    `);
  }
}
