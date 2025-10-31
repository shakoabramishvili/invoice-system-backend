import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const totalInvoices = await this.prisma.invoice.count();
    const totalRevenue = await this.prisma.invoice.aggregate({
      _sum: { grandTotal: true },
    });

    return {
      success: true,
      data: {
        totalInvoices,
        totalRevenue: totalRevenue._sum.grandTotal || 0,
      },
    };
  }
}
