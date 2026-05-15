import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CountryPackCrModule } from '../country-packs/cr/country-pack-cr.module';
import {
  defaultFiscalProviderInternals,
  DefaultFiscalProvider,
} from './providers/default-fiscal.provider';
import { FiscalApplicationService } from './services/fiscal-application.service';
import { FiscalProviderResolver } from './services/fiscal-provider-resolver.service';

@Module({
  imports: [PrismaModule, CountryPackCrModule],
  providers: [
    ...defaultFiscalProviderInternals,
    DefaultFiscalProvider,
    FiscalProviderResolver,
    FiscalApplicationService,
  ],
  exports: [FiscalProviderResolver, FiscalApplicationService],
})
export class FiscalCoreModule {}
