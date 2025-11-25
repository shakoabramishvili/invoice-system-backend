import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { SalesReportService } from './sales-report.service';
import { CreateSalesReportDto } from './dto/create-sales-report.dto';
import { UpdateSalesReportDto } from './dto/update-sales-report.dto';
import { QuerySalesReportDto } from './dto/query-sales-report.dto';
import { DeleteSalesReportDto } from './dto/delete-sales-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Sales Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales-report')
export class SalesReportController {
  constructor(private readonly salesReportService: SalesReportService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Create a new sales report' })
  @ApiResponse({ status: 201, description: 'Sales report created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createDto: CreateSalesReportDto) {
    return this.salesReportService.create(createDto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Create multiple sales reports' })
  @ApiResponse({ status: 201, description: 'Sales reports created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  createMany(@Body() createDtos: CreateSalesReportDto[]) {
    return this.salesReportService.createMany(createDtos);
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Export sales reports to Excel' })
  @ApiQuery({ name: 'invoiceNumber', required: false, type: String })
  @ApiQuery({ name: 'passenger', required: false, type: String })
  @ApiQuery({ name: 'buyer', required: false, type: String })
  @ApiQuery({ name: 'provider', required: false, type: String })
  @ApiQuery({ name: 'productName', required: false, type: String })
  @ApiQuery({ name: 'issueDateFrom', required: false, type: String })
  @ApiQuery({ name: 'issueDateTo', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Excel file generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async exportToExcel(@Query() query: QuerySalesReportDto, @Res() res: Response) {
    const buffer = await this.salesReportService.exportToExcel(query);

    const dateFrom = query.issueDateFrom ? new Date(query.issueDateFrom).toISOString().split('T')[0] : '';
    const dateTo = query.issueDateTo ? new Date(query.issueDateTo).toISOString().split('T')[0] : '';
    const dateRange = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : dateFrom ? `_from_${dateFrom}` : dateTo ? `_to_${dateTo}` : '';
    const filename = `sales_report${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get all sales reports with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Sales reports retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: QuerySalesReportDto) {
    return this.salesReportService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.ACCOUNTANT, Role.VIEWER)
  @ApiOperation({ summary: 'Get a single sales report by ID' })
  @ApiResponse({ status: 200, description: 'Sales report retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Sales report not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id') id: string) {
    return this.salesReportService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Update a sales report' })
  @ApiResponse({ status: 200, description: 'Sales report updated successfully' })
  @ApiResponse({ status: 404, description: 'Sales report not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSalesReportDto,
    @CurrentUser() user: any,
  ) {
    return this.salesReportService.update(id, updateDto, user.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Partially update a sales report' })
  @ApiResponse({ status: 200, description: 'Sales report updated successfully' })
  @ApiResponse({ status: 404, description: 'Sales report not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  patch(
    @Param('id') id: string,
    @Body() updateDto: UpdateSalesReportDto,
    @CurrentUser() user: any,
  ) {
    return this.salesReportService.update(id, updateDto, user.id);
  }

  @Patch('bulk/update')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Update multiple sales reports' })
  @ApiResponse({ status: 200, description: 'Sales reports updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  updateMany(
    @Body() body: { ids: string[]; data: UpdateSalesReportDto },
    @CurrentUser() user: any,
  ) {
    return this.salesReportService.updateMany(body.ids, body.data, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Delete a sales report (soft delete)' })
  @ApiResponse({ status: 200, description: 'Sales report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sales report not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.salesReportService.remove(id, user.id);
  }

  @Delete()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Delete multiple sales reports (soft delete)' })
  @ApiResponse({ status: 200, description: 'Sales reports deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  removeMany(@Body() deleteDto: DeleteSalesReportDto, @CurrentUser() user: any) {
    return this.salesReportService.removeMany(deleteDto.ids, user.id);
  }
}
