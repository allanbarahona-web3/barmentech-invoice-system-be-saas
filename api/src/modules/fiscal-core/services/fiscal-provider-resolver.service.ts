import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CostaRicaFiscalProvider } from '../../country-packs/cr/costa-rica-fiscal.provider';
import { FiscalProvider } from '../interfaces';
import { DefaultFiscalProvider } from '../providers/default-fiscal.provider';

@Injectable()
export class FiscalProviderResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultProvider: DefaultFiscalProvider,
    private readonly costaRicaProvider: CostaRicaFiscalProvider,
  ) {}

  async resolveForTenant(tenantId: number): Promise<FiscalProvider> {
    const tenant = (await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    })) as any;

    // TODO(deprecation): remove config.countryPack fallback after all tenants are migrated
    // to first-class tenant.countryPack.
    const countryPack = tenant?.countryPack || tenant?.config?.countryPack;
    return this.resolveForCountryPack(countryPack);
  }

  resolveForCountryPack(countryPack?: string | null): FiscalProvider {
    const normalized = (countryPack || 'default').toLowerCase().trim();

    if (normalized === 'cr' || normalized === 'costa-rica' || normalized === 'costa_rica') {
      return this.costaRicaProvider;
    }

    return this.defaultProvider;
  }
}
