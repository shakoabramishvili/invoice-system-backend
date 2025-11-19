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
    // Verify seller exists and is not deleted
    const seller = await this.prisma.seller.findUnique({
      where: { id: createInvoiceDto.sellerId }
    });

    if (!seller || seller.deletedAt) {
      throw new NotFoundException('Seller not found');
    }

    // Verify buyer exists if provided
    let buyer = null;
    if (createInvoiceDto.buyerId) {
      buyer = await this.prisma.buyer.findUnique({
        where: { id: createInvoiceDto.buyerId }
      });

      if (!buyer || buyer.deletedAt) {
        throw new NotFoundException('Buyer not found');
      }
    }

    // Determine which bank to use
    let bankId: string;
    if (createInvoiceDto.bankId) {
      // Verify the provided bank exists and belongs to the seller
      const bank = await this.prisma.bank.findUnique({
        where: { id: createInvoiceDto.bankId }
      });

      if (!bank || bank.deletedAt) {
        throw new NotFoundException('Bank not found');
      }

      if (bank.sellerId !== createInvoiceDto.sellerId) {
        throw new BadRequestException('Bank does not belong to the selected seller');
      }

      bankId = createInvoiceDto.bankId;
    } else {
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

      bankId = defaultBank.id;
    }

    // Calculate dueDate as issueDate + 1 month
    const issueDate = new Date(createInvoiceDto.issueDate);
    const dueDate = new Date(issueDate);
    dueDate.setMonth(dueDate.getMonth() + 1);

    // Use transaction to prevent race conditions in invoice number generation
    const invoice = await this.prisma.$transaction(async (prisma) => {
      // Generate invoice number within transaction
      const invoiceNumberData = await this.generateInvoiceNumberInTransaction(
        prisma,
        seller.prefix,
        buyer?.prefix,
      );

      // Create invoice with passengers and products
      return await prisma.invoice.create({
        data: {
          invoiceNumber: invoiceNumberData.invoiceNumber,
          prefix: invoiceNumberData.prefix,
          year: invoiceNumberData.year,
          serial: invoiceNumberData.serial,
          sellerId: createInvoiceDto.sellerId,
          buyerId: createInvoiceDto.buyerId,
          legalType: createInvoiceDto.legalType,
          bankId: bankId,
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
          showTermsAndConditions: createInvoiceDto.showTermsAndConditions,
          description: createInvoiceDto.description,
          notes: createInvoiceDto.notes,
          termsAndConditions: createInvoiceDto.termsAndConditions,
          passengers: {
            create: createInvoiceDto.passengers.map((p, index) => ({
              gender: p.gender,
              firstName: p.firstName,
              lastName: p.lastName,
              birthDate: p.birthDate ? new Date(p.birthDate) : null,
              isMain: index === 0, // First passenger is main
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
      const searchTerms = filters.search.trim().split(/\s+/);
      const orConditions: any[] = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { buyer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { passengers: { some: { firstName: { contains: filters.search, mode: 'insensitive' } } } },
        { passengers: { some: { lastName: { contains: filters.search, mode: 'insensitive' } } } },
      ];

      // If search has multiple words, also search for first name + last name combination
      if (searchTerms.length >= 2) {
        const firstName = searchTerms[0];
        const lastName = searchTerms.slice(1).join(' ');
        orConditions.push({
          passengers: {
            some: {
              AND: [
                { firstName: { contains: firstName, mode: 'insensitive' } },
                { lastName: { contains: lastName, mode: 'insensitive' } },
              ],
            },
          },
        });
      }

      where.OR = orConditions;
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

    // Determine which bank to use
    let bankId = invoice.bankId;

    // If bankId is explicitly provided, validate and use it
    if (updateInvoiceDto.bankId) {
      const bank = await this.prisma.bank.findUnique({
        where: { id: updateInvoiceDto.bankId }
      });

      if (!bank || bank.deletedAt) {
        throw new NotFoundException('Bank not found');
      }

      // Check if bank belongs to the current or new seller
      const targetSellerId = updateInvoiceDto.sellerId || invoice.sellerId;
      if (bank.sellerId !== targetSellerId) {
        throw new BadRequestException('Bank does not belong to the selected seller');
      }

      bankId = updateInvoiceDto.bankId;
    }
    // If seller is being changed but no bankId provided, get the new seller's default bank
    else if (updateInvoiceDto.sellerId && updateInvoiceDto.sellerId !== invoice.sellerId) {
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
        ...(updateInvoiceDto.sellerId && { sellerId: updateInvoiceDto.sellerId }),
        ...((updateInvoiceDto.bankId || bankId !== invoice.bankId) && { bankId }),
        ...(updateInvoiceDto.buyerId !== undefined && { buyerId: updateInvoiceDto.buyerId }),
        ...(updateInvoiceDto.legalType && { legalType: updateInvoiceDto.legalType }),
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
        ...(updateInvoiceDto.showTermsAndConditions !== undefined && { showTermsAndConditions: updateInvoiceDto.showTermsAndConditions }),
        ...(updateInvoiceDto.description !== undefined && { description: updateInvoiceDto.description }),
        ...(updateInvoiceDto.notes !== undefined && { notes: updateInvoiceDto.notes }),
        ...(updateInvoiceDto.termsAndConditions !== undefined && { termsAndConditions: updateInvoiceDto.termsAndConditions }),
        ...(updateInvoiceDto.passengers && {
          passengers: {
            create: updateInvoiceDto.passengers.map((p, index) => ({
              gender: p.gender,
              firstName: p.firstName,
              lastName: p.lastName,
              birthDate: p.birthDate ? new Date(p.birthDate) : null,
              isMain: index === 0, // First passenger is main
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
      const searchTerms = filters.search.trim().split(/\s+/);
      const orConditions: any[] = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { buyer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { passengers: { some: { firstName: { contains: filters.search, mode: 'insensitive' } } } },
        { passengers: { some: { lastName: { contains: filters.search, mode: 'insensitive' } } } },
      ];

      // If search has multiple words, also search for first name + last name combination
      if (searchTerms.length >= 2) {
        const firstName = searchTerms[0];
        const lastName = searchTerms.slice(1).join(' ');
        orConditions.push({
          passengers: {
            some: {
              AND: [
                { firstName: { contains: firstName, mode: 'insensitive' } },
                { lastName: { contains: lastName, mode: 'insensitive' } },
              ],
            },
          },
        });
      }

      where.OR = orConditions;
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
      const searchTerms = filters.search.trim().split(/\s+/);
      const orConditions: any[] = [
        { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
        { buyer: { name: { contains: filters.search, mode: 'insensitive' } } },
        { passengers: { some: { firstName: { contains: filters.search, mode: 'insensitive' } } } },
        { passengers: { some: { lastName: { contains: filters.search, mode: 'insensitive' } } } },
      ];

      // If search has multiple words, also search for first name + last name combination
      if (searchTerms.length >= 2) {
        const firstName = searchTerms[0];
        const lastName = searchTerms.slice(1).join(' ');
        orConditions.push({
          passengers: {
            some: {
              AND: [
                { firstName: { contains: firstName, mode: 'insensitive' } },
                { lastName: { contains: lastName, mode: 'insensitive' } },
              ],
            },
          },
        });
      }

      where.OR = orConditions;
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
      { header: 'Notes', key: 'notes', width: 40 },
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

      // Handle customer name logic for individuals without a registered buyer
      let customerName = invoice.buyer?.name || '';
      if (invoice.legalType === 'INDIVIDUAL' && !invoice.buyerId && invoice.passengers.length > 0) {
        const mainPassenger = invoice.passengers.find(p => p.isMain);
        if (mainPassenger) {
          customerName = `${mainPassenger.firstName} ${mainPassenger.lastName}`;
        }
      }

      const row = worksheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        issueDate: formatDate(invoice.issueDate),
        dueDate: formatDate(invoice.dueDate),
        departureDate: formatDate(invoice.departureDate),
        supplierName: invoice.seller?.name || '',
        customerName: customerName,
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
        notes: invoice.notes || '',
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
        to: { row: invoices.length + 1, column: 18 }
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
      'serial': { serial: sortOrder || 'desc' },
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

    // Default sorting by serial descending (most recent invoices first)
    return { serial: 'desc' };
  }

  private async generateInvoiceNumberInTransaction(
    prisma: any,
    sellerPrefix: string,
    buyerPrefix?: string,
  ): Promise<{
    invoiceNumber: string;
    prefix: string;
    year: string;
    serial: number;
  }> {
    // Generate prefix: INV-{SellerPrefix}{BuyerPrefix?}
    const prefix = `INV-${sellerPrefix}${buyerPrefix || ''}`;

    // Get current year (last 2 digits)
    const currentYear = new Date().getFullYear();
    const year = currentYear.toString().slice(-2);

    // Find the last invoice for this year (within transaction)
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        year: year,
      },
      orderBy: { serial: 'desc' },
    });

    // Increment serial or start at 1
    const serial = lastInvoice?.serial ? lastInvoice.serial + 1 : 1;

    // Pad serial to 4 digits
    const paddedSerial = serial.toString().padStart(4, '0');

    // Generate full invoice number: INV-{SellerPrefix}{BuyerPrefix?}-{Year}/{Serial}
    const invoiceNumber = `${prefix}-${year}/${paddedSerial}`;

    return {
      invoiceNumber,
      prefix,
      year,
      serial,
    };
  }
}
