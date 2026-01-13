import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface RecaptchaResponse {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
  error_codes?: string[];
}

@Injectable()
export class RecaptchaService {
  private recaptchaSecretKey: string;
  private recaptchaVerifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
  private scoreThreshold = 0.5; // Umbral mínimo de puntuación

  constructor(private configService: ConfigService) {
    this.recaptchaSecretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
  }

  /**
   * Verifica el token de reCAPTCHA v3 con Google
   * Retorna true si el token es válido y el score está por encima del umbral
   */
  async validateToken(token: string, expectedAction: string): Promise<boolean> {
    if (!this.recaptchaSecretKey) {
      console.warn('⚠️ RECAPTCHA_SECRET_KEY no configurado - saltando validación');
      return true; // En desarrollo sin config, permitir
    }

    try {
      const response = await axios.post<RecaptchaResponse>(
        this.recaptchaVerifyUrl,
        null,
        {
          params: {
            secret: this.recaptchaSecretKey,
            response: token,
          },
        },
      );

      const { success, score, action, error_codes } = response.data;

      console.log('🔐 reCAPTCHA Response:', {
        success,
        score,
        action,
        expectedAction,
        errors: error_codes,
      });

      // Verificar que la respuesta sea exitosa
      if (!success) {
        console.error('❌ reCAPTCHA validation failed:', error_codes);
        throw new BadRequestException('reCAPTCHA validation failed');
      }

      // Verificar que la acción coincida
      if (action !== expectedAction) {
        console.error('❌ reCAPTCHA action mismatch:', { expected: expectedAction, got: action });
        throw new BadRequestException('reCAPTCHA action mismatch');
      }

      // Verificar que el score esté por encima del umbral
      if (score < this.scoreThreshold) {
        console.error('❌ reCAPTCHA score too low:', { score, threshold: this.scoreThreshold });
        throw new BadRequestException('reCAPTCHA score too low - possible bot activity');
      }

      console.log(`✅ reCAPTCHA validated successfully (score: ${score})`);
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error validating reCAPTCHA:', error.message);
      throw new BadRequestException('reCAPTCHA verification error');
    }
  }

  /**
   * Verifica el token y retorna el score (para análisis avanzado)
   */
  async validateTokenAndGetScore(token: string, expectedAction: string): Promise<number> {
    if (!this.recaptchaSecretKey) {
      console.warn('⚠️ RECAPTCHA_SECRET_KEY no configurado - retornando score 1.0');
      return 1.0; // En desarrollo sin config, asumir humano
    }

    try {
      const response = await axios.post<RecaptchaResponse>(
        this.recaptchaVerifyUrl,
        null,
        {
          params: {
            secret: this.recaptchaSecretKey,
            response: token,
          },
        },
      );

      const { success, score, action, error_codes } = response.data;

      console.log('🔐 reCAPTCHA Response (with score):', {
        success,
        score,
        action,
        expectedAction,
      });

      if (!success) {
        throw new BadRequestException('reCAPTCHA validation failed');
      }

      if (action !== expectedAction) {
        throw new BadRequestException('reCAPTCHA action mismatch');
      }

      return score;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('❌ Error validating reCAPTCHA:', error.message);
      throw new BadRequestException('reCAPTCHA verification error');
    }
  }
}
