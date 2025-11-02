import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { PdfService } from './pdf.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateInvoiceStatusDto, UpdatePaymentStatusDto } from './dto/update-invoice-status.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly pdfService: PdfService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Create a new invoice (Admin & Operator only)' })
  create(@Body() createInvoiceDto: CreateInvoiceDto, @CurrentUser() user: any) {
    return this.invoicesService.create(createInvoiceDto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'paymentStatus', required: false, type: String })
  @ApiQuery({ name: 'sellerId', required: false, type: String })
  @ApiQuery({ name: 'buyerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by (e.g., invoiceNumber, issueDate, buyer.name, user.fullName)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (asc or desc)' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('sellerId') sellerId?: string,
    @Query('buyerId') buyerId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.invoicesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      {
        status,
        paymentStatus,
        sellerId,
        buyerId,
        search,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      },
    );
  }

  @Get('export')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Export invoices to Excel' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'paymentStatus', required: false, type: String })
  @ApiQuery({ name: 'sellerId', required: false, type: String })
  @ApiQuery({ name: 'buyerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async exportInvoices(
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('sellerId') sellerId?: string,
    @Query('buyerId') buyerId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.invoicesService.exportToExcel({
      status,
      paymentStatus,
      sellerId,
      buyerId,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    const filename = `invoices_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  @Get('canceled/export')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Export canceled invoices to Excel' })
  @ApiQuery({ name: 'paymentStatus', required: false, type: String })
  @ApiQuery({ name: 'sellerId', required: false, type: String })
  @ApiQuery({ name: 'buyerId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async exportCanceledInvoices(
    @Query('paymentStatus') paymentStatus?: string,
    @Query('sellerId') sellerId?: string,
    @Query('buyerId') buyerId?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Res() res?: Response,
  ) {
    const buffer = await this.invoicesService.exportCanceledToExcel({
      paymentStatus,
      sellerId,
      buyerId,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    const filename = `canceled_invoices_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  @Get('canceled')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get canceled invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by issue date from (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by issue date to (YYYY-MM-DD)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by (e.g., invoiceNumber, issueDate, buyer.name, user.fullName)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (asc or desc)' })
  getCanceled(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.invoicesService.getCanceled(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    );
  }

  @Get(':id/pdf')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Generate invoice PDF' })
  @ApiQuery({ name: 'template', required: false, type: String, description: 'Template name (default: default-invoice)' })
  async downloadPdf(
    @Param('id') id: string,
    @Query('template') template: string,
    @Res() res: Response,
  ) {
    const result = await this.invoicesService.findOne(id);
    const invoice = result.data;

    const pdfBuffer = await this.pdfService.generateInvoicePdf(invoice, template);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    res.send(pdfBuffer);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get invoice by ID' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Update invoice' })
  update(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.update(id, updateInvoiceDto, user.id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Update invoice status' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateInvoiceStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.updateStatus(id, updateStatusDto, user.id);
  }

  @Patch(':id/payment-status')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Update payment status' })
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.updatePaymentStatus(id, updatePaymentStatusDto, user.id);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: 'Cancel invoice' })
  cancel(
    @Param('id') id: string,
    @Body() cancelDto: CancelInvoiceDto,
    @CurrentUser() user: any,
  ) {
    return this.invoicesService.cancel(id, cancelDto, user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete invoice (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.invoicesService.remove(id, user.id);
  }
}
