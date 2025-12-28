import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'pennyweis-trading-platform',
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check' })
  @ApiResponse({ status: 200, description: 'Detailed service health information' })
  detailedHealthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'pennyweis-trading-platform',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node_version: process.version,
    };
  }
}