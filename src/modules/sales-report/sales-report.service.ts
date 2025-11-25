import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSalesReportDto } from './dto/create-sales-report.dto';
import { UpdateSalesReportDto } from './dto/update-sales-report.dto';
import { QuerySalesReportDto } from './dto/query-sales-report.dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class SalesReportService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateSalesReportDto) {
    try {
      const salesReport = await this.prisma.salesReport.create({
        data: {
          issueDate: createDto.issueDate,
          productName: createDto.productName,
          ticketNumber: createDto.ticketNumber,
          pnr: createDto.pnr,
          airlineCompany: createDto.airlineCompany,
          passenger: createDto.passenger,
          destination: createDto.destination,
          departureArrivalDate: createDto.departureArrivalDate,
          fare: createDto.fare,
          net: createDto.net,
          serviceFee: createDto.serviceFee,
          totalAmount: createDto.totalAmount,
          invoiceNumber: createDto.invoiceNumber,
          provider: createDto.provider,
          createdBy: createDto.createdBy,
          buyer: createDto.buyer,
          comment: createDto.comment,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId: createDto.createdBy,
          action: 'CREATE',
          resource: 'SALES_REPORT',
          resourceId: salesReport.id,
          details: `Created sales report for invoice ${createDto.invoiceNumber}`,
        },
      });

      return {
        success: true,
        message: 'Sales report created successfully',
        data: salesReport,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create sales report: ${error.message}`);
    }
  }

  async createMany(createDtos: CreateSalesReportDto[]) {
    try {
      const salesReports = await this.prisma.$transaction(
        createDtos.map((dto) =>
          this.prisma.salesReport.create({
            data: {
              issueDate: dto.issueDate,
              productName: dto.productName,
              ticketNumber: dto.ticketNumber,
              pnr: dto.pnr,
              airlineCompany: dto.airlineCompany,
              passenger: dto.passenger,
              destination: dto.destination,
              departureArrivalDate: dto.departureArrivalDate,
              fare: dto.fare,
              net: dto.net,
              serviceFee: dto.serviceFee,
              totalAmount: dto.totalAmount,
              invoiceNumber: dto.invoiceNumber,
              provider: dto.provider,
              createdBy: dto.createdBy,
              buyer: dto.buyer,
              comment: dto.comment,
            },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          }),
        ),
      );

      if (createDtos.length > 0 && createDtos[0].createdBy) {
        await this.prisma.activityLog.create({
          data: {
            userId: createDtos[0].createdBy,
            action: 'CREATE',
            resource: 'SALES_REPORT',
            resourceId: null,
            details: `Created ${salesReports.length} sales report records`,
          },
        });
      }

      return {
        success: true,
        message: `Successfully created ${salesReports.length} sales reports`,
        data: salesReports,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create sales reports: ${error.message}`);
    }
  }

  async findAll(query: QuerySalesReportDto) {
    const {
      page = 1,
      limit = 50,
      invoiceNumber,
      passenger,
      buyer,
      provider,
      productName,
      issueDateFrom,
      issueDateTo,
      search,
    } = query;

    const skip = (page - 1) * limit;

    const andConditions: Prisma.SalesReportWhereInput[] = [];

    if (invoiceNumber) {
      andConditions.push({ invoiceNumber: { contains: invoiceNumber, mode: 'insensitive' } });
    }

    if (passenger) {
      andConditions.push({ passenger: { contains: passenger, mode: 'insensitive' } });
    }

    if (buyer) {
      andConditions.push({ buyer: { contains: buyer, mode: 'insensitive' } });
    }

    if (provider) {
      andConditions.push({ provider: { contains: provider, mode: 'insensitive' } });
    }

    if (productName) {
      andConditions.push({ productName: { contains: productName, mode: 'insensitive' } });
    }

    if (issueDateFrom || issueDateTo) {
      const dateFilter: any = {};
      if (issueDateFrom) dateFilter.gte = issueDateFrom;
      if (issueDateTo) dateFilter.lte = issueDateTo;
      andConditions.push({ issueDate: dateFilter });
    }

    const where: Prisma.SalesReportWhereInput = {
      deletedAt: null,
    };

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { passenger: { contains: search, mode: 'insensitive' } },
        { buyer: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [salesReports, total] = await Promise.all([
      this.prisma.salesReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.salesReport.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: salesReports,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const salesReport = await this.prisma.salesReport.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!salesReport) {
      throw new NotFoundException(`Sales report with ID ${id} not found`);
    }

    return {
      success: true,
      data: salesReport,
    };
  }

  async update(id: string, updateDto: UpdateSalesReportDto, userId: string) {
    const existing = await this.prisma.salesReport.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Sales report with ID ${id} not found`);
    }

    try {
      const updated = await this.prisma.salesReport.update({
        where: { id },
        data: updateDto,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'UPDATE',
          resource: 'SALES_REPORT',
          resourceId: id,
          details: `Updated sales report`,
        },
      });

      return {
        success: true,
        message: 'Sales report updated successfully',
        data: updated,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update sales report: ${error.message}`);
    }
  }

  async updateMany(ids: string[], updateDto: UpdateSalesReportDto, userId: string) {
    const existing = await this.prisma.salesReport.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    if (existing.length === 0) {
      throw new NotFoundException('No sales reports found with the provided IDs');
    }

    if (existing.length !== ids.length) {
      throw new BadRequestException(
        `Some sales reports were not found or already deleted. Found ${existing.length} out of ${ids.length}`,
      );
    }

    try {
      const updated = await this.prisma.salesReport.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: updateDto,
      });

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'UPDATE',
          resource: 'SALES_REPORT',
          resourceId: null,
          details: `Updated ${updated.count} sales reports`,
        },
      });

      return {
        success: true,
        message: `Successfully updated ${updated.count} sales reports`,
        data: { count: updated.count },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update sales reports: ${error.message}`);
    }
  }

  async remove(id: string, userId: string) {
    const existing = await this.prisma.salesReport.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`Sales report with ID ${id} not found`);
    }

    try {
      const deleted = await this.prisma.salesReport.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'DELETE',
          resource: 'SALES_REPORT',
          resourceId: id,
          details: `Soft deleted sales report`,
        },
      });

      return {
        success: true,
        message: 'Sales report deleted successfully',
        data: deleted,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete sales report: ${error.message}`);
    }
  }

  async removeMany(ids: string[], userId: string) {
    const existing = await this.prisma.salesReport.findMany({
      where: { id: { in: ids }, deletedAt: null },
    });

    if (existing.length === 0) {
      throw new NotFoundException('No sales reports found with the provided IDs');
    }

    try {
      const deleted = await this.prisma.salesReport.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'DELETE',
          resource: 'SALES_REPORT',
          resourceId: null,
          details: `Soft deleted ${deleted.count} sales reports`,
        },
      });

      return {
        success: true,
        message: `Successfully deleted ${deleted.count} sales reports`,
        data: { count: deleted.count },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete sales reports: ${error.message}`);
    }
  }

  async exportToExcel(query: QuerySalesReportDto): Promise<any> {
    const {
      invoiceNumber,
      passenger,
      buyer,
      provider,
      productName,
      issueDateFrom,
      issueDateTo,
      search,
    } = query;

    // Build where clause - same logic as findAll
    const andConditions: Prisma.SalesReportWhereInput[] = [];

    if (invoiceNumber) {
      andConditions.push({ invoiceNumber: { contains: invoiceNumber, mode: 'insensitive' } });
    }

    if (passenger) {
      andConditions.push({ passenger: { contains: passenger, mode: 'insensitive' } });
    }

    if (buyer) {
      andConditions.push({ buyer: { contains: buyer, mode: 'insensitive' } });
    }

    if (provider) {
      andConditions.push({ provider: { contains: provider, mode: 'insensitive' } });
    }

    if (productName) {
      andConditions.push({ productName: { contains: productName, mode: 'insensitive' } });
    }

    if (issueDateFrom || issueDateTo) {
      const dateFilter: any = {};
      if (issueDateFrom) dateFilter.gte = new Date(issueDateFrom);
      if (issueDateTo) dateFilter.lte = new Date(issueDateTo);
      andConditions.push({ issueDate: dateFilter });
    }

    const where: Prisma.SalesReportWhereInput = {
      deletedAt: null,
    };

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { passenger: { contains: search, mode: 'insensitive' } },
        { buyer: { contains: search, mode: 'insensitive' } },
        { provider: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch all sales reports without pagination
    const salesReports = await this.prisma.salesReport.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return this.generateExcelFile(salesReports);
  }

  private async generateExcelFile(salesReports: any[]): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Define columns
    worksheet.columns = [
      { header: 'Issue Date', key: 'issueDate', width: 15 },
      { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
      { header: 'Passenger', key: 'passenger', width: 25 },
      { header: 'Product Name', key: 'productName', width: 35 },
      { header: 'Ticket Number', key: 'ticketNumber', width: 15 },
      { header: 'PNR', key: 'pnr', width: 12 },
      { header: 'Airline Company', key: 'airlineCompany', width: 20 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Departure/Arrival Date', key: 'departureArrivalDate', width: 20 },
      { header: 'Fare', key: 'fare', width: 12 },
      { header: 'Net', key: 'net', width: 12 },
      { header: 'Service Fee', key: 'serviceFee', width: 12 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Provider', key: 'provider', width: 20 },
      { header: 'Buyer', key: 'buyer', width: 25 },
      { header: 'Comment', key: 'comment', width: 40 },
      { header: 'Created By', key: 'createdBy', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // Indigo color
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Format date helper
    const formatDate = (date: Date | null | string): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };

    const formatDateTime = (date: Date | null | string): string => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    };

    // Add data rows
    salesReports.forEach((report, index) => {
      const row = worksheet.addRow({
        issueDate: formatDate(report.issueDate),
        invoiceNumber: report.invoiceNumber || '',
        passenger: report.passenger || '',
        productName: report.productName || '',
        ticketNumber: report.ticketNumber || '',
        pnr: report.pnr || '',
        airlineCompany: report.airlineCompany || '',
        destination: report.destination || '',
        departureArrivalDate: formatDateTime(report.departureArrivalDate),
        fare: report.fare ? Number(report.fare) : null,
        net: report.net ? Number(report.net) : null,
        serviceFee: report.serviceFee ? Number(report.serviceFee) : null,
        totalAmount: report.totalAmount ? Number(report.totalAmount) : null,
        provider: report.provider || '',
        buyer: report.buyer || '',
        comment: report.comment || '',
        createdBy: report.user?.fullName || '',
        createdAt: formatDate(report.createdAt),
      });

      // Apply number format to numeric columns
      const rowNumber = index + 2; // +2 because row 1 is header and Excel is 1-indexed
      worksheet.getCell(`J${rowNumber}`).numFmt = '#,##0.00'; // Fare
      worksheet.getCell(`K${rowNumber}`).numFmt = '#,##0.00'; // Net
      worksheet.getCell(`L${rowNumber}`).numFmt = '#,##0.00'; // Service Fee
      worksheet.getCell(`M${rowNumber}`).numFmt = '#,##0.00'; // Total Amount
    });

    // Add autofilter to all columns
    if (salesReports.length > 0) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length },
      };
    }

    // Generate buffer
    return await workbook.xlsx.writeBuffer();
  }
}
