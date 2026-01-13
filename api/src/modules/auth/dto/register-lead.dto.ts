import { IsEmail, IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class RegisterLeadDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  fullname: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[\d\s\-\+\(\)]+$/, {
    message: 'telephone must contain only digits, spaces, dashes, plus sign and parentheses',
  })
  telephone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;

  @IsString()
  @IsNotEmpty()
  recaptchaToken: string;
}
