import { Module } from '@nestjs/common';
import { CatalogItemsV1Controller } from './catalog-items/catalog-items-v1.controller';
import { CatalogItemsV1Service } from './catalog-items/catalog-items-v1.service';
import { CompanyProfileV1Controller } from './company-profile/company-profile-v1.controller';
import { CompanyProfileV1Service } from './company-profile/company-profile-v1.service';
import { CustomersV1Controller } from './customers/customers-v1.controller';
import { CustomersV1Service } from './customers/customers-v1.service';
import { DocumentsV1Controller } from './documents/documents-v1.controller';
import { DocumentsV1Service } from './documents/documents-v1.service';
import { ExpensesV1Controller } from './expenses/expenses-v1.controller';
import { ExpensesV1Service } from './expenses/expenses-v1.service';
import { ReceiptsV1Controller } from './receipts/receipts-v1.controller';
import { ReceiptsV1Service } from './receipts/receipts-v1.service';
import { TenantSettingsV1Controller } from './tenant-settings/tenant-settings-v1.controller';
import { TenantSettingsV1Service } from './tenant-settings/tenant-settings-v1.service';
import { V3DbService } from './v3-db.service';

@Module({
  controllers: [
    DocumentsV1Controller,
    CustomersV1Controller,
    CatalogItemsV1Controller,
    TenantSettingsV1Controller,
    CompanyProfileV1Controller,
    ReceiptsV1Controller,
    ExpensesV1Controller,
  ],
  providers: [
    DocumentsV1Service,
    CustomersV1Service,
    CatalogItemsV1Service,
    TenantSettingsV1Service,
    CompanyProfileV1Service,
    ReceiptsV1Service,
    ExpensesV1Service,
    V3DbService,
  ],
})
export class V3CompatModule {}
