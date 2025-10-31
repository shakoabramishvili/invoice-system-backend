import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('top-buyers')
  @ApiOperation({ summary: 'Get top 5 buyers by total revenue' })
  getTopBuyers() {
    return this.dashboardService.getTopBuyers();
  }

  @Get('invoices-per-employee')
  @ApiOperation({ summary: 'Get number of processed invoices per employee' })
  getInvoicesPerEmployee() {
    return this.dashboardService.getInvoicesPerEmployee();
  }
}