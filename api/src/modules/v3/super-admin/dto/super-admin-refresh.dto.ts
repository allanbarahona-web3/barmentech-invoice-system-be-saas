import { IsString, MinLength } from 'class-validator';

export class SuperAdminRefreshDto {
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
