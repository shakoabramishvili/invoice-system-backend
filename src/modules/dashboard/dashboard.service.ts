import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrencyService } from '../currency/currency.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
  ) {}

  async getStats() {
    // Count all invoices except canceled
    const totalInvoices = await this.prisma.invoice.count({
      where: {
        status: { not: 'CANCELED' },
      },
    });

    // Count canceled invoices
    const totalCanceledInvoices = await this.prisma.invoice.count({
      where: {
        status: 'CANCELED',
      },
    });

    // Calculate revenue by currency (excluding canceled invoices)
    const revenueUSD = await this.prisma.invoice.aggregate({
      where: {
        currencyTo: 'USD',
        status: { not: 'CANCELED' },
      },
      _sum: { grandTotal: true },
    });

    const revenueGEL = await this.prisma.invoice.aggregate({
      where: {
        currencyTo: 'GEL',
        status: { not: 'CANCELED' },
      },
      _sum: { grandTotal: true },
    });

    const revenueEUR = await this.prisma.invoice.aggregate({
      where: {
        currencyTo: 'EUR',
        status: { not: 'CANCELED' },
      },
      _sum: { grandTotal: true },
    });

    return {
      success: true,
      data: {
        totalInvoices,
        totalCanceledInvoices,
        revenueUSD: revenueUSD._sum.grandTotal || 0,
        revenueGEL: revenueGEL._sum.grandTotal || 0,
        revenueEUR: revenueEUR._sum.grandTotal || 0,
      },
    };
  }

  async getTopBuyers() {
    // Get all non-canceled invoices with buyer information
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { not: 'CANCELED' },
      },
      select: {
        buyerId: true,
        grandTotal: true,
        currencyTo: true,
        buyer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group invoices by buyer
    const buyerMap = new Map<
      string,
      {
        name: string;
        invoiceCount: number;
        revenueByCurrency: Record<string, number>;
        totalRevenue: number;
      }
    >();

    for (const invoice of invoices) {
      const buyerId = invoice.buyerId;
      const currency = invoice.currencyTo || 'USD';
      const grandTotal = Number(invoice.grandTotal);

      if (!buyerMap.has(buyerId)) {
        buyerMap.set(buyerId, {
          name: invoice.buyer.name,
          invoiceCount: 0,
          revenueByCurrency: {},
          totalRevenue: 0,
        });
      }

      const buyer = buyerMap.get(buyerId)!;
      buyer.invoiceCount += 1;
      buyer.revenueByCurrency[currency] =
        (buyer.revenueByCurrency[currency] || 0) + grandTotal;
      buyer.totalRevenue += grandTotal;
    }

    // Convert map to array and sort by total revenue
    const topBuyers = Array.from(buyerMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map(({ name, invoiceCount, revenueByCurrency }) => ({
        name,
        invoiceCount,
        revenueByCurrency,
      }));

    return {
      success: true,
      data: topBuyers,
    };
  }

  async getInvoicesPerEmployee() {
    // Get all non-canceled invoices with employee information
    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: { not: 'CANCELED' },
      },
      select: {
        createdBy: true,
        user: {
          select: {
            fullName: true,
            profilePicture: true,
          },
        },
      },
    });

    // Group invoices by employee
    const employeeMap = new Map<
      string,
      {
        fullName: string;
        avatar: string | null;
        invoiceCount: number;
      }
    >();

    for (const invoice of invoices) {
      const userId = invoice.createdBy;

      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, {
          fullName: invoice.user.fullName,
          avatar: invoice.user.profilePicture,
          invoiceCount: 0,
        });
      }

      const employee = employeeMap.get(userId)!;
      employee.invoiceCount += 1;
    }

    // Convert map to array and sort by invoice count
    const employeeStats = Array.from(employeeMap.values()).sort(
      (a, b) => b.invoiceCount - a.invoiceCount,
    );

    return {
      success: true,
      data: employeeStats,
    };
  }

  async getCurrencyRates() {
    const rates = await this.currencyService.getCachedRates();
    return {
      success: true,
      data: rates,
    };
  }
}
