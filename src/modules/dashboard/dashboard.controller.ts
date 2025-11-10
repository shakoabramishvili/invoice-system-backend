import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('top-buyers')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get top 5 buyers by total revenue' })
  getTopBuyers() {
    return this.dashboardService.getTopBuyers();
  }

  @Get('invoices-per-employee')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get number of processed invoices per employee' })
  getInvoicesPerEmployee() {
    return this.dashboardService.getInvoicesPerEmployee();
  }

  @Get('currency-rates')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get cached currency exchange rates from all banks' })
  getCurrencyRates() {
    return this.dashboardService.getCurrencyRates();
  }

  @Get('recent-invoices')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get last 10 recent invoices (excluding canceled)' })
  getRecentInvoices() {
    return this.dashboardService.getRecentInvoices();
  }
}