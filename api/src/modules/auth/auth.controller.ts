import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterMayoristaDto } from './dto/register-mayorista.dto';
import { CrmSignupDto } from './dto/crm-signup.dto';
import { RegisterLeadDto } from './dto/register-lead.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-mayorista')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })  // 5 registros por hora
  registerMayorista(@Body() registerMayoristaDto: RegisterMayoristaDto) {
    return this.authService.registerMayorista(registerMayoristaDto);
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })  // 3 requests per hour
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 100, ttl: 60000 } })   // 100 requests per minute (development)
  login(@Body() loginDto: LoginDto, @Request() req) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })   // 20 requests per minute
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @SkipThrottle()  // Authenticated users can logout frequently
  logout(@Request() req, @Body('refreshToken') refreshToken: string) {
    return this.authService.logout(req.user.userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('revoke-all')
  @SkipThrottle()  // Authenticated users can revoke tokens frequently
  revokeAllTokens(@Request() req) {
    return this.authService.revokeAllUserTokens(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  @SkipThrottle()  // Profile endpoint can be called frequently
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('crm/signup')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })  // 3 requests per hour
  crmSignup(@Body() crmSignupDto: CrmSignupDto, @Request() req) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.crmSignup(crmSignupDto, ipAddress, userAgent);
  }

  @Post('register-lead')
  @Throttle({ default: { limit: 5, ttl: 3600000 } })  // 5 requests per hour
  registerLead(@Body() registerLeadDto: RegisterLeadDto, @Request() req) {
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];
    console.log('📋 New lead registration request from:', ipAddress);
    return this.authService.registerLead(registerLeadDto);
  }
}
