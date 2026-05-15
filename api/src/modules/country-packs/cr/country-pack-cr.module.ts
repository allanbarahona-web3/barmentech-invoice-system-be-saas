import { Module } from '@nestjs/common';
import {
  costaRicaFiscalProviderInternals,
  CostaRicaFiscalProvider,
} from './costa-rica-fiscal.provider';

@Module({
  providers: [...costaRicaFiscalProviderInternals, CostaRicaFiscalProvider],
  exports: [CostaRicaFiscalProvider],
})
export class CountryPackCrModule {}
