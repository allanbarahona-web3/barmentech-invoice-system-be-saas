import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { TokenService } from './services/token.service';
import { StorageService } from './services/storage.service';
import { DOSpacesService } from './services/do-spaces.service';
import { CryptoService } from './services/crypto.service';
import { RecaptchaService } from './services/recaptcha.service';
import { FilesController } from './controllers/files.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [FilesController],
  providers: [
    TokenService,
    StorageService,
    DOSpacesService,
    CryptoService,
    RecaptchaService,
    // 🚨 Apply ThrottlerGuard globally to all routes
    // Can be disabled per endpoint with @SkipThrottle() decorator
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [TokenService, StorageService, DOSpacesService, CryptoService, RecaptchaService],
})
export class CommonModule {}
