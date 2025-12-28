import { Controller, Get, Param, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RiskTolerance, TradingExperience } from '../../entities/user.entity';

class UpdateProfileDto {
  fullName?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  preferredQuoteCurrency?: string;
  riskTolerance?: RiskTolerance;
  tradingExperience?: TradingExperience;
}

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getCurrentUser(@Request() req) {
    try {
      const user = await this.usersService.findOne(req.user.id);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    try {
      const user = await this.usersService.updateProfile(req.user.id, updateProfileDto);
      return {
        success: true,
        data: user,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved successfully' })
  async getUserStats(@Request() req) {
    try {
      const stats = await this.usersService.getUserStats(req.user.id);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    try {
      const user = await this.usersService.findOne(id);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('username/:username')
  @ApiOperation({ summary: 'Get user by username' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByUsername(@Param('username') username: string) {
    try {
      const user = await this.usersService.findByUsername(username);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Patch('me/deactivate')
  @ApiOperation({ summary: 'Deactivate current user account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  async deactivateAccount(@Request() req) {
    try {
      const user = await this.usersService.deactivateUser(req.user.id);
      return {
        success: true,
        data: user,
        message: 'Account deactivated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}