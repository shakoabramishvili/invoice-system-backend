import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';
import { LegalType } from '@prisma/client';

@Injectable()
export class BuyersService {
  constructor(private prisma: PrismaService) {}

  async create(createBuyerDto: CreateBuyerDto, currentUserId: string) {
    // Check for duplicate taxId
    const existingBuyer = await this.prisma.buyer.findFirst({
      where: {
        taxId: createBuyerDto.taxId,
        deletedAt: null,
      },
    });

    if (existingBuyer) {
      throw new ConflictException('Buyer with this tax ID already exists');
    }

    const buyer = await this.prisma.buyer.create({
      data: {
        ...createBuyerDto,
        country: createBuyerDto.country || 'Georgia',
      },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'CREATE',
        resource: 'BUYER',
        resourceId: buyer.id,
        details: `Created buyer: ${buyer.name} (Tax ID: ${buyer.taxId})`,
      },
    });

    return {
      success: true,
      message: 'Buyer created successfully',
      data: buyer,
    };
  }

  async findAll(
    page = 1,
    limit = 50,
    search?: string,
    legalType?: string,
    includeDeleted = false,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filter out soft-deleted records by default
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    // Filter by legal type
    if (legalType && Object.values(LegalType).includes(legalType as LegalType)) {
      where.legalType = legalType;
    }

    // Search by name, taxId, or email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameLocal: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [buyers, total] = await Promise.all([
      this.prisma.buyer.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              invoices: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.buyer.count({ where }),
    ]);

    return {
      success: true,
      data: buyers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!buyer || buyer.deletedAt) {
      throw new NotFoundException('Buyer not found');
    }

    return {
      success: true,
      data: buyer,
    };
  }

  async update(id: string, updateBuyerDto: UpdateBuyerDto, currentUserId: string) {
    const existingBuyer = await this.prisma.buyer.findUnique({
      where: { id },
    });

    if (!existingBuyer || existingBuyer.deletedAt) {
      throw new NotFoundException('Buyer not found');
    }

    // Check for duplicate taxId if it's being updated
    if (updateBuyerDto.taxId && updateBuyerDto.taxId !== existingBuyer.taxId) {
      const duplicateBuyer = await this.prisma.buyer.findFirst({
        where: {
          taxId: updateBuyerDto.taxId,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (duplicateBuyer) {
        throw new ConflictException('Buyer with this tax ID already exists');
      }
    }

    const buyer = await this.prisma.buyer.update({
      where: { id },
      data: updateBuyerDto,
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE',
        resource: 'BUYER',
        resourceId: id,
        details: `Updated buyer: ${buyer.name} (Tax ID: ${buyer.taxId})`,
      },
    });

    return {
      success: true,
      message: 'Buyer updated successfully',
      data: buyer,
    };
  }

  async remove(id: string, currentUserId: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!buyer || buyer.deletedAt) {
      throw new NotFoundException('Buyer not found');
    }

    // Perform soft delete - allow even if there are invoices
    const deletedBuyer = await this.prisma.buyer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'DELETE',
        resource: 'BUYER',
        resourceId: id,
        details: `Soft deleted buyer: ${buyer.name} (Tax ID: ${buyer.taxId})`,
      },
    });

    return {
      success: true,
      message: 'Buyer deleted successfully',
      data: {
        id: deletedBuyer.id,
        deletedAt: deletedBuyer.deletedAt,
      },
    };
  }

  async restore(id: string, currentUserId: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    if (!buyer.deletedAt) {
      throw new ConflictException('Buyer is not deleted');
    }

    const restoredBuyer = await this.prisma.buyer.update({
      where: { id },
      data: {
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'RESTORE',
        resource: 'BUYER',
        resourceId: id,
        details: `Restored buyer: ${buyer.name} (Tax ID: ${buyer.taxId})`,
      },
    });

    return {
      success: true,
      message: 'Buyer restored successfully',
      data: restoredBuyer,
    };
  }

  async hardDelete(id: string, currentUserId: string) {
    const buyer = await this.prisma.buyer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    if (buyer._count.invoices > 0) {
      throw new ConflictException(
        `Cannot permanently delete buyer with ${buyer._count.invoices} associated invoice(s)`,
      );
    }

    await this.prisma.buyer.delete({
      where: { id },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'HARD_DELETE',
        resource: 'BUYER',
        resourceId: id,
        details: `Permanently deleted buyer: ${buyer.name} (Tax ID: ${buyer.taxId})`,
      },
    });

    return {
      success: true,
      message: 'Buyer permanently deleted successfully',
    };
  }
}
