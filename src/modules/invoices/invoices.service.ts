import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateInvoiceStatusDto, UpdatePaymentStatusDto } from './dto/update-invoice-status.dto';
import { CancelInvoiceDto } from './dto/cancel-invoice.dto';
import { InvoiceStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  async create(createInvoiceDto: CreateInvoiceDto, currentUserId: string) {
    // Verify seller and buyer exist and are not deleted
    const [seller, buyer] = await Promise.all([
      this.prisma.seller.findUnique({ where: { id: createInvoiceDto.sellerId } }),
      this.prisma.buyer.findUnique({ where: { id: createInvoiceDto.buyerId } }),
    ]);

    if (!seller || seller.deletedAt) {
      throw new NotFoundException('Seller not found');
    }
    if (!buyer || buyer.deletedAt) {
      throw new NotFoundException('Buyer not found');
    }

    // Get the seller's default bank
    const defaultBank = await this.prisma.bank.findFirst({
      where: {
        sellerId: createInvoiceDto.sellerId,
        isDefault: true,
        deletedAt: null,
      },
    });

    if (!defaultBank) {
      throw new BadRequestException('Seller does not have a default bank account');
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(seller.prefix, buyer.prefix);

    // Calculate dueDate as issueDate + 1 month
    const issueDate = new Date(createInvoiceDto.issueDate);
    const dueDate = new Date(issueDate);
    dueDate.setMonth(dueDate.getMonth() + 1);

    // Create invoice with passengers and products
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        sellerId: createInvoiceDto.sellerId,
        buyerId: createInvoiceDto.buyerId,
        bankId: defaultBank.id,
        createdBy: currentUserId,
        issueDate: issueDate,
        dueDate: dueDate,
        departureDate: createInvoiceDto.departureDate ? new Date(createInvoiceDto.departureDate) : null,
        subtotal: createInvoiceDto.subtotal,
        discountType: createInvoiceDto.discountType,
        discountValue: createInvoiceDto.discountValue,
        discountAmount: createInvoiceDto.discountAmount,
        totalAfterDiscount: createInvoiceDto.totalAfterDiscount,
        currencyFrom: createInvoiceDto.currencyFrom,
        exchangeRate: createInvoiceDto.exchangeRate,
        currencyTo: createInvoiceDto.currencyTo,
        grandTotal: createInvoiceDto.grandTotal,
        showLogo: createInvoiceDto.showLogo,
        showStamp: createInvoiceDto.showStamp,
        description: createInvoiceDto.description,
        notes: createInvoiceDto.notes,
        termsAndConditions: createInvoiceDto.termsAndConditions,
        passengers: {
          create: createInvoiceDto.passengers.map((p) => ({
            gender: p.gender,
            firstName: p.firstName,
            lastName: p.lastName,
            birthDate: p.birthDate ? new Date(p.birthDate) : null,
          })),
        },
        products: {
          create: createInvoiceDto.products.map((p) => ({
            description: p.description,
            direction: p.direction,
            departureDate: p.departureDate ? new Date(p.departureDate) : null,
            arrivalDate: p.arrivalDate ? new Date(p.arrivalDate) : null,
            quantity: p.quantity,
            price: p.price,
            total: p.total,
          })),
        },
      },
      include: {
        seller: true,
        buyer: true,
        bank: true,
        user: { select: { id: true, fullName: true, email: true } },
        passengers: true,
        products: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'CREATE',
        resource: 'INVOICE',
        resourceId: invoice.id,
        details: `Created invoice: ${invoice.invoiceNumber}`,
      },
    });

    return {
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    };
  }

  async findAll(page = 1, limit = 50, filters?: any) {
    const where: any = {
      deletedAt: null,
      status: { not: InvoiceStatus.CANCELED }
    };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters?.sellerId) {
      where.sellerId = filters.sellerId;
    }
    if (filters?.buyerId) {
      where.buyerId = filters.buyerId;
    }
    if (filters?.search && filters.search.trim() !== '') {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.startDate || filters?.endDate) {
      where.issueDate = {};
      if (filters.startDate) {
        where.issueDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.issueDate.lte = new Date(filters.endDate);
      }
    }

    // Build orderBy clause
    const orderBy = this.buildOrderBy(filters?.sortBy, filters?.sortOrder);

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          seller: true,
          buyer: true,
          bank: true,
          user: { select: { id: true, fullName: true, email: true } },
          passengers: true,
          products: true,
        },
        orderBy,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      success: true,
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        seller: true,
        buyer: true,
        bank: true,
        user: { select: { id: true, fullName: true, email: true } },
        passengers: true,
        products: true,
      },
    });

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      success: true,
      data: invoice,
    };
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto, currentUserId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Invoice not found');
    }

    // If seller is being changed, get the new seller's default bank
    let bankId = invoice.bankId;
    if (updateInvoiceDto.sellerId && updateInvoiceDto.sellerId !== invoice.sellerId) {
      const defaultBank = await this.prisma.bank.findFirst({
        where: {
          sellerId: updateInvoiceDto.sellerId,
          isDefault: true,
          deletedAt: null,
        },
      });

      if (!defaultBank) {
        throw new BadRequestException('New seller does not have a default bank account');
      }

      bankId = defaultBank.id;
    }

    // Calculate dueDate if issueDate is being updated
    let dueDate: Date | undefined;
    if (updateInvoiceDto.issueDate) {
      const issueDate = new Date(updateInvoiceDto.issueDate);
      dueDate = new Date(issueDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    // Delete existing passengers and products if provided
    if (updateInvoiceDto.passengers) {
      await this.prisma.passenger.deleteMany({ where: { invoiceId: id } });
    }
    if (updateInvoiceDto.products) {
      await this.prisma.product.deleteMany({ where: { invoiceId: id } });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(updateInvoiceDto.sellerId && { sellerId: updateInvoiceDto.sellerId, bankId }),
        ...(updateInvoiceDto.buyerId && { buyerId: updateInvoiceDto.buyerId }),
        ...(updateInvoiceDto.issueDate && { issueDate: new Date(updateInvoiceDto.issueDate), dueDate }),
        ...(updateInvoiceDto.departureDate && { departureDate: new Date(updateInvoiceDto.departureDate) }),
        ...(updateInvoiceDto.subtotal !== undefined && { subtotal: updateInvoiceDto.subtotal }),
        ...(updateInvoiceDto.discountType !== undefined && { discountType: updateInvoiceDto.discountType }),
        ...(updateInvoiceDto.discountValue !== undefined && { discountValue: updateInvoiceDto.discountValue }),
        ...(updateInvoiceDto.discountAmount !== undefined && { discountAmount: updateInvoiceDto.discountAmount }),
        ...(updateInvoiceDto.totalAfterDiscount !== undefined && { totalAfterDiscount: updateInvoiceDto.totalAfterDiscount }),
        ...(updateInvoiceDto.currencyFrom && { currencyFrom: updateInvoiceDto.currencyFrom }),
        ...(updateInvoiceDto.exchangeRate !== undefined && { exchangeRate: updateInvoiceDto.exchangeRate }),
        ...(updateInvoiceDto.currencyTo !== undefined && { currencyTo: updateInvoiceDto.currencyTo }),
        ...(updateInvoiceDto.grandTotal !== undefined && { grandTotal: updateInvoiceDto.grandTotal }),
        ...(updateInvoiceDto.showLogo !== undefined && { showLogo: updateInvoiceDto.showLogo }),
        ...(updateInvoiceDto.showStamp !== undefined && { showStamp: updateInvoiceDto.showStamp }),
        ...(updateInvoiceDto.description !== undefined && { description: updateInvoiceDto.description }),
        ...(updateInvoiceDto.notes !== undefined && { notes: updateInvoiceDto.notes }),
        ...(updateInvoiceDto.termsAndConditions !== undefined && { termsAndConditions: updateInvoiceDto.termsAndConditions }),
        ...(updateInvoiceDto.passengers && {
          passengers: {
            create: updateInvoiceDto.passengers.map((p) => ({
              gender: p.gender,
              firstName: p.firstName,
              lastName: p.lastName,
              birthDate: p.birthDate ? new Date(p.birthDate) : null,
            })),
          },
        }),
        ...(updateInvoiceDto.products && {
          products: {
            create: updateInvoiceDto.products.map((p) => ({
              description: p.description,
              direction: p.direction,
              departureDate: p.departureDate ? new Date(p.departureDate) : null,
              arrivalDate: p.arrivalDate ? new Date(p.arrivalDate) : null,
              quantity: p.quantity,
              price: p.price,
              total: p.total,
            })),
          },
        }),
      },
      include: {
        seller: true,
        buyer: true,
        bank: true,
        user: { select: { id: true, fullName: true, email: true } },
        passengers: true,
        products: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE',
        resource: 'INVOICE',
        resourceId: id,
        details: `Updated invoice: ${updated.invoiceNumber}`,
      },
    });

    return {
      success: true,
      message: 'Invoice updated successfully',
      data: updated,
    };
  }

  async updateStatus(id: string, updateStatusDto: UpdateInvoiceStatusDto, currentUserId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Invoice not found');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: updateStatusDto.status },
      include: {
        seller: true,
        buyer: true,
        bank: true,
        user: { select: { id: true, fullName: true, email: true } },
        passengers: true,
        products: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE_STATUS',
        resource: 'INVOICE',
        resourceId: id,
        details: `Changed invoice status to: ${updateStatusDto.status}`,
      },
    });

    return {
      success: true,
      message: 'Invoice status updated successfully',
      data: updated,
    };
  }

  async updatePaymentStatus(id: string, updatePaymentStatusDto: UpdatePaymentStatusDto, currentUserId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Invoice not found');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { paymentStatus: updatePaymentStatusDto.paymentStatus },
      include: {
        seller: true,
        buyer: true,
        bank: true,
        user: { select: { id: true, fullName: true, email: true } },
        passengers: true,
        products: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE_PAYMENT_STATUS',
        resource: 'INVOICE',
        resourceId: id,
        details: `Changed payment status to: ${updatePaymentStatusDto.paymentStatus}`,
      },
    });

    return {
      success: true,
      message: 'Payment status updated successfully',
      data: updated,
    };
  }

  async cancel(id: string, cancelDto: CancelInvoiceDto, currentUserId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Invoice not found');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.CANCELED,
        cancelReason: cancelDto.cancelReason,
        canceledAt: new Date(),
      },
      include: {
        seller: true,
        buyer: true,
        bank: true,
        user: { select: { id: true, fullName: true, email: true } },
        passengers: true,
        products: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'CANCEL',
        resource: 'INVOICE',
        resourceId: id,
        details: `Canceled invoice: ${updated.invoiceNumber} - ${cancelDto.cancelReason}`,
      },
    });

    return {
      success: true,
      message: 'Invoice canceled successfully',
      data: updated,
    };
  }

  async getCanceled(page = 1, limit = 50, search?: string, startDate?: string, endDate?: string, sortBy?: string, sortOrder?: string) {
    return this.findAll(page, limit, { status: InvoiceStatus.CANCELED, search, startDate, endDate, sortBy, sortOrder });
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    // Build where clause
    const where: any = {
      deletedAt: null,
      status: { not: InvoiceStatus.CANCELED }
    };

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters?.sellerId) {
      where.sellerId = filters.sellerId;
    }
    if (filters?.buyerId) {
      where.buyerId = filters.buyerId;
    }
    if (filters?.search && filters.search.trim() !== '') {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.startDate || filters?.endDate) {
      where.issueDate = {};
      if (filters.startDate) {
        where.issueDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.issueDate.lte = new Date(filters.endDate);
      }
    }

    // Build orderBy clause
    const orderBy = this.buildOrderBy(filters?.sortBy, filters?.sortOrder);

    // Fetch all invoices without pagination
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        seller: true,
        buyer: true,
        bank: true,
        user: { select: { id: true, fullName: true, email: true } },
        passengers: true,
        products: true,
      },
      orderBy,
    });

    return this.generateExcelFile(invoices);
  }

  async exportCanceledToExcel(filters?: any): Promise<Buffer> {
    const canceledFilters = { ...filters, status: InvoiceStatus.CANCELED };

    // Build where clause
    const where: any = {
      deletedAt: null,
      status: InvoiceStatus.CANCELED
    };

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters?.sellerId) {
      where.sellerId = filters.sellerId;
    }
    if (filters?.buyerId) {
      where.buyerId = filters.buyerId;
    }
    if (filters?.search && filters.search.trim() !== '') {
      where.OR = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.startDate || filters?.endDate) {
      where.issueDate = {};
      if (filters.startDate) {
        where.issueDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.issueDate.lte = new Date(filters.endDate);
      }
    }

    // Build orderBy clause
    const orderBy = this.buildOrderBy(filters?.sortBy, filters?.sortOrder);

    // Fetch all canceled invoices without pagination
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        seller: true,
        buyer: true,
        bank: true,
        user: { select: { id: true, fullName: true, email: true } },
        passengers: true,
        products: true,
      },
      orderBy,
    });

    return this.generateExcelFile(invoices);
  }

  private async generateExcelFile(invoices: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices');

    // Define columns
    worksheet.columns = [
      { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
      { header: 'Issue Date', key: 'issueDate', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
      { header: 'Departure Date', key: 'departureDate', width: 15 },
      { header: 'Supplier', key: 'supplierName', width: 25 },
      { header: 'Customer', key: 'customerName', width: 25 },
      { header: 'Passengers', key: 'passengers', width: 30 },
      { header: 'Product Description', key: 'productDescription', width: 40 },
      { header: 'Product Direction', key: 'productDirection', width: 25 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Discount Amount', key: 'discountAmount', width: 15 },
      { header: 'Total After Discount', key: 'totalAfterDiscount', width: 18 },
      { header: 'Currency From', key: 'currencyFrom', width: 12 },
      { header: 'Exchange Rate', key: 'exchangeRate', width: 15 },
      { header: 'Currency To', key: 'currencyTo', width: 12 },
      { header: 'Grand Total', key: 'grandTotal', width: 15 },
      { header: 'Created By', key: 'createdBy', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEF4444' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Format date helper
    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };

    // Add data rows
    invoices.forEach((invoice, index) => {
      const passengers = invoice.passengers
        .map(p => `${p.gender} ${p.firstName} ${p.lastName}`)
        .join('; ');

      const productDescriptions = invoice.products
        .map(p => p.description)
        .join('; ');

      const productDirections = invoice.products
        .map(p => p.direction || '')
        .filter(d => d)
        .join('; ');

      const row = worksheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: formatDate(invoice.issueDate),
        dueDate: formatDate(invoice.dueDate),
        departureDate: formatDate(invoice.departureDate),
        supplierName: invoice.seller?.name || '',
        customerName: invoice.buyer?.name || '',
        passengers,
        productDescription: productDescriptions,
        productDirection: productDirections,
        subtotal: Number(invoice.subtotal) || 0,
        discountAmount: Number(invoice.discountAmount) || 0,
        totalAfterDiscount: Number(invoice.totalAfterDiscount) || 0,
        currencyFrom: invoice.currencyFrom,
        exchangeRate: Number(invoice.exchangeRate) || 0,
        currencyTo: invoice.currencyTo || '',
        grandTotal: Number(invoice.grandTotal) || 0,
        createdBy: invoice.user?.fullName || '',
      });

      // Apply number format to numeric columns (shows decimals with 2 decimal places)
      const rowNumber = index + 2; // +2 because row 1 is header and Excel is 1-indexed
      worksheet.getCell(`J${rowNumber}`).numFmt = '#,##0.00'; // Subtotal
      worksheet.getCell(`K${rowNumber}`).numFmt = '#,##0.00'; // Discount Amount
      worksheet.getCell(`L${rowNumber}`).numFmt = '#,##0.00'; // Total After Discount
      worksheet.getCell(`N${rowNumber}`).numFmt = '#,##0.0000'; // Exchange Rate (4 decimals for precision)
      worksheet.getCell(`P${rowNumber}`).numFmt = '#,##0.00'; // Grand Total
    });

    // Add autofilter to all columns
    if (invoices.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: invoices.length + 1, column: 17 }
      };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async remove(id: string, currentUserId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });

    if (!invoice || invoice.deletedAt) {
      throw new NotFoundException('Invoice not found');
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'DELETE',
        resource: 'INVOICE',
        resourceId: id,
        details: `Soft deleted invoice: ${invoice.invoiceNumber}`,
      },
    });

    return {
      success: true,
      message: 'Invoice deleted successfully',
    };
  }

  private buildOrderBy(sortBy?: string, sortOrder?: string): any {
    // Allowed sort fields mapping
    const allowedSortFields = {
      'invoiceNumber': { invoiceNumber: sortOrder || 'desc' },
      'issueDate': { issueDate: sortOrder || 'desc' },
      'dueDate': { dueDate: sortOrder || 'desc' },
      'departureDate': { departureDate: sortOrder || 'desc' },
      'subtotal': { subtotal: sortOrder || 'desc' },
      'currencyTo': { currencyTo: sortOrder || 'desc' },
      'buyer.name': { buyer: { name: sortOrder || 'asc' } },
      'seller.name': { seller: { name: sortOrder || 'asc' } },
      'user.fullName': { user: { fullName: sortOrder || 'asc' } },
      'products.description': { products: { _count: sortOrder || 'desc' } },
      'products.direction': { products: { _count: sortOrder || 'desc' } },
      'passengers.firstName': { passengers: { _count: sortOrder || 'desc' } },
    };

    // Validate sortBy field
    if (sortBy && allowedSortFields[sortBy]) {
      return allowedSortFields[sortBy];
    }

    // Default sorting by issueDate descending
    return { issueDate: 'desc' };
  }

  private async generateInvoiceNumber(sellerPrefix: string, buyerPrefix?: string): Promise<string> {
    // Combine seller and buyer prefixes
    const prefix = `${sellerPrefix}${buyerPrefix || ''}`;

    // Find the last invoice for this seller
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let number = 1;
    if (lastInvoice) {
      // Extract the number from the invoice number
      const lastNumber = lastInvoice.invoiceNumber.replace(prefix, '');
      number = parseInt(lastNumber) + 1;
    }

    // Pad to 4 digits
    const paddedNumber = number.toString().padStart(4, '0');

    return `${prefix}${paddedNumber}`;
  }
}
