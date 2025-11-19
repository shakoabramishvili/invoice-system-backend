import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

@Injectable()
export class BanksService {
  constructor(private prisma: PrismaService) {}

  async create(createBankDto: CreateBankDto, currentUserId: string) {
    // Verify seller exists
    const seller = await this.prisma.seller.findUnique({
      where: { id: createBankDto.sellerId },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    // If this bank is set as default, unset other defaults for this seller
    if (createBankDto.isDefault) {
      await this.prisma.bank.updateMany({
        where: {
          sellerId: createBankDto.sellerId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const bank = await this.prisma.bank.create({
      data: {
        ...createBankDto,
        isDefault: createBankDto.isDefault || false,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            prefix: true,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'CREATE',
        resource: 'BANK',
        resourceId: bank.id,
        details: `Created bank: ${bank.name} for seller ${seller.name}`,
      },
    });

    return {
      success: true,
      message: 'Bank created successfully',
      data: bank,
    };
  }

  async findAll(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { swift: { contains: search, mode: 'insensitive' } },
        { accountNumberGEL: { contains: search, mode: 'insensitive' } },
        { accountNumberUSD: { contains: search, mode: 'insensitive' } },
        { accountNumberEUR: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [banks, total] = await Promise.all([
      this.prisma.bank.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              prefix: true,
            },
          },
        },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      this.prisma.bank.count({ where }),
    ]);

    return {
      success: true,
      data: banks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySeller(sellerId: string) {
    // Verify seller exists
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const banks = await this.prisma.bank.findMany({
      where: {
        sellerId,
        deletedAt: null,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            prefix: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return {
      success: true,
      data: banks,
    };
  }

  async findOne(id: string) {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            prefix: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!bank || bank.deletedAt) {
      throw new NotFoundException('Bank not found');
    }

    return {
      success: true,
      data: bank,
    };
  }

  async update(id: string, updateBankDto: UpdateBankDto, currentUserId: string) {
    const existingBank = await this.prisma.bank.findUnique({
      where: { id },
      include: {
        seller: true,
      },
    });

    if (!existingBank || existingBank.deletedAt) {
      throw new NotFoundException('Bank not found');
    }

    // If setting this bank as default, unset other defaults for this seller
    if (updateBankDto.isDefault) {
      await this.prisma.bank.updateMany({
        where: {
          sellerId: existingBank.sellerId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const bank = await this.prisma.bank.update({
      where: { id },
      data: updateBankDto,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            prefix: true,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE',
        resource: 'BANK',
        resourceId: id,
        details: `Updated bank: ${bank.name}`,
      },
    });

    return {
      success: true,
      message: 'Bank updated successfully',
      data: bank,
    };
  }

  async setDefault(id: string, currentUserId: string) {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
      include: {
        seller: true,
      },
    });

    if (!bank || bank.deletedAt) {
      throw new NotFoundException('Bank not found');
    }

    // If already default, no need to do anything
    if (bank.isDefault) {
      return {
        success: true,
        message: 'Bank is already set as default',
        data: bank,
      };
    }

    // Unset other defaults for this seller
    await this.prisma.bank.updateMany({
      where: {
        sellerId: bank.sellerId,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Set this bank as default
    const updatedBank = await this.prisma.bank.update({
      where: { id },
      data: { isDefault: true },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            prefix: true,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE',
        resource: 'BANK',
        resourceId: id,
        details: `Set bank ${bank.name} as default for seller ${bank.seller.name}`,
      },
    });

    return {
      success: true,
      message: 'Bank set as default successfully',
      data: updatedBank,
    };
  }

  async remove(id: string, currentUserId: string) {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
      include: {
        seller: true,
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!bank || bank.deletedAt) {
      throw new NotFoundException('Bank not found');
    }

    // Check if bank is used in any invoices
    if (bank._count.invoices > 0) {
      throw new ConflictException(
        `Cannot delete bank. It is used in ${bank._count.invoices} invoice(s). Consider soft deleting instead.`
      );
    }

    // Soft delete
    const deletedBank = await this.prisma.bank.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isDefault: false, // Unset default when soft deleting
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'DELETE',
        resource: 'BANK',
        resourceId: id,
        details: `Deleted bank: ${bank.name}`,
      },
    });

    return {
      success: true,
      message: 'Bank deleted successfully',
    };
  }
}
