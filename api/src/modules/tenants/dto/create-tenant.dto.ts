import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { TenantStatus, BillingStatus } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @IsEnum(BillingStatus)
  @IsOptional()
  billingStatus?: BillingStatus;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  countryPack?: string;

  @IsOptional()
  config?: any;
}
