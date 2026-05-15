import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

const ALLOWED_COUNTRY_PACKS = ['default', 'cr', 'mx', 'us'];

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  private normalizeCountryConfig<T extends { countryCode?: string; countryPack?: string }>(
    payload: T,
    options: { setDefaultPack: boolean },
  ): T {
    const normalized = { ...payload };

    if (normalized.countryCode !== undefined) {
      normalized.countryCode = normalized.countryCode?.trim().toUpperCase();
      if (normalized.countryCode && !/^[A-Z]{2}$/.test(normalized.countryCode)) {
        throw new BadRequestException('countryCode must be a valid ISO 2-letter code');
      }
      if (!normalized.countryCode) {
        normalized.countryCode = undefined;
      }
    }

    if (normalized.countryPack !== undefined) {
      normalized.countryPack = normalized.countryPack?.trim().toLowerCase();
      if (!normalized.countryPack) {
        normalized.countryPack = undefined;
      }
    }

    if (options.setDefaultPack && normalized.countryPack === undefined) {
      normalized.countryPack = 'default';
    }

    if (
      normalized.countryPack !== undefined &&
      !ALLOWED_COUNTRY_PACKS.includes(normalized.countryPack)
    ) {
      throw new BadRequestException(
        `countryPack must be one of: ${ALLOWED_COUNTRY_PACKS.join(', ')}`,
      );
    }

    return normalized;
  }

  async create(createTenantDto: CreateTenantDto) {
    const normalizedDto = this.normalizeCountryConfig(createTenantDto, {
      setDefaultPack: true,
    });

    // Verificar si el slug ya existe
    const existing = await this.prisma.tenant.findUnique({
      where: { slug: normalizedDto.slug },
    });

    if (existing) {
      throw new ConflictException('Slug already exists');
    }

    return this.prisma.tenant.create({
      data: normalizedDto,
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug ${slug} not found`);
    }

    return tenant;
  }

  async update(id: number, updateTenantDto: UpdateTenantDto) {
    await this.findOne(id);

    const normalizedDto = this.normalizeCountryConfig(updateTenantDto, {
      setDefaultPack: false,
    });

    return this.prisma.tenant.update({
      where: { id },
      data: normalizedDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.tenant.delete({
      where: { id },
    });
  }
}
