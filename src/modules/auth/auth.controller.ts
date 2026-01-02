import { Controller, Post, Body, UseGuards, Request, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { WalletService } from '../wallet/wallet.service';

import { PasswordService } from './password.service';
import { IsEmail, IsOptional, isString, IsString } from 'class-validator';

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  country?: string;
}

class LoginDto {
  @IsEmail()
  email: string;
  @IsString()
  password: string;
}

class RefreshTokenDto {
  refreshToken: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private walletService: WalletService,
    private passwordService: PasswordService,
  ) { }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  async register(@Body() registerDto: RegisterDto) {
    // Validate password strength

    const passwordValidation = this.passwordService.validatePasswordStrength(registerDto.password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException({
        success: false,
        message: 'Password validation failed',
        errors: passwordValidation.errors,
      });
    }

    try {
      const result = await this.authService.register(registerDto);
      return {
        success: true,
        data: result
      };
    }
    catch (error) {
      if (error.code === '23505') { // Postgres unique violation
        if (error.constraint?.includes('email')) {
          throw new ConflictException('Email already exists');
        }
        if (error.constraint?.includes('username')) {
          throw new ConflictException('Username already taken');
        }
        throw new ConflictException('User already exists');
      }
      throw error; // Re-throw unknown errors
    }
  }


  @UseGuards(AuthGuard('local'))
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req, @Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(req.user);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      await this.authService.logout(refreshTokenDto.refreshToken);
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify JWT token' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  async verify(@Request() req) {
    return {
      success: true,
      user: req.user,
    };
  }
}