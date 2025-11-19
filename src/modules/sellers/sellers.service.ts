import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class SellersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(
    createSellerDto: CreateSellerDto,
    files: { logo?: Express.Multer.File[]; stamp?: Express.Multer.File[] },
    currentUserId: string,
  ) {
    // Check for existing prefix
    const existingPrefix = await this.prisma.seller.findUnique({
      where: { prefix: createSellerDto.prefix },
    });

    if (existingPrefix) {
      throw new ConflictException('Prefix already exists');
    }

    // Upload logo if provided
    let logoUrl: string | undefined;
    if (files?.logo && files.logo[0]) {
      const uploadResult = await this.uploadService.uploadImage(
        files.logo[0],
        'sellers/logos',
      );
      logoUrl = uploadResult.cdnUrl;
    }

    // Upload stamp if provided
    let stampUrl: string | undefined;
    if (files?.stamp && files.stamp[0]) {
      const uploadResult = await this.uploadService.uploadImage(
        files.stamp[0],
        'sellers/stamps',
      );
      stampUrl = uploadResult.cdnUrl;
    }

    // Extract banks from DTO
    const { banks, logo, stamp, ...sellerData } = createSellerDto;

    // Validate banks if provided
    if (banks && banks.length > 0) {
      for (const bank of banks) {
        if (!bank.name || !bank.swift || !bank.address || !bank.accountNumberGEL) {
          throw new BadRequestException('Each bank must have name, swift, address, and accountNumberGEL');
        }
      }
    }

    // Use transaction to create seller and banks together
    const seller = await this.prisma.$transaction(async (tx) => {
      // Create seller
      const createdSeller = await tx.seller.create({
        data: {
          ...sellerData,
          logo: logoUrl,
          stamp: stampUrl,
        },
      });

      // Create banks if provided
      if (banks && banks.length > 0) {
        // If any bank is marked as default, ensure only one is default
        const hasDefault = banks.some(bank => bank.isDefault);

        for (let i = 0; i < banks.length; i++) {
          const bank = banks[i];
          await tx.bank.create({
            data: {
              sellerId: createdSeller.id,
              name: bank.name,
              swift: bank.swift,
              address: bank.address,
              accountNumberGEL: bank.accountNumberGEL,
              accountNumberUSD: bank.accountNumberUSD,
              accountNumberEUR: bank.accountNumberEUR,
              intermediaryBankName: bank.intermediaryBankName,
              intermediaryBankSwift: bank.intermediaryBankSwift,
              // Only the first bank marked as default will be default
              isDefault: hasDefault ? (i === 0 && bank.isDefault) : (i === 0),
            },
          });
        }
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: currentUserId,
          action: 'CREATE',
          resource: 'SELLER',
          resourceId: createdSeller.id,
          details: `Created seller: ${createdSeller.name} (${createdSeller.prefix})${banks ? ` with ${banks.length} bank(s)` : ''}`,
        },
      });

      // Return seller with banks
      return await tx.seller.findUnique({
        where: { id: createdSeller.id },
        include: {
          banks: {
            where: { deletedAt: null },
            orderBy: [
              { isDefault: 'desc' },
              { createdAt: 'desc' },
            ],
          },
        },
      });
    });

    return {
      success: true,
      message: 'Seller created successfully',
      data: seller,
    };
  }

  async findAll(page = 1, limit = 50, search?: string, legalType?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (legalType) {
      where.legalType = legalType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameLocal: { contains: search, mode: 'insensitive' } },
        { prefix: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        skip,
        take: limit,
        include: {
          banks: true,
          _count: {
            select: {
              invoices: true,
              banks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.seller.count({ where }),
    ]);

    return {
      success: true,
      data: sellers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        banks: {
          where: {
            deletedAt: null,
          },
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!seller || seller.deletedAt) {
      throw new NotFoundException('Seller not found');
    }

    return {
      success: true,
      data: seller,
    };
  }

  async update(
    id: string,
    updateSellerDto: UpdateSellerDto,
    files: { logo?: Express.Multer.File[]; stamp?: Express.Multer.File[] },
    currentUserId: string,
  ) {
    const existingSeller = await this.prisma.seller.findUnique({
      where: { id },
    });

    if (!existingSeller) {
      throw new NotFoundException('Seller not found');
    }

    // Check if prefix is being updated and if it already exists
    if (updateSellerDto.prefix && updateSellerDto.prefix !== existingSeller.prefix) {
      const prefixExists = await this.prisma.seller.findUnique({
        where: { prefix: updateSellerDto.prefix },
      });

      if (prefixExists) {
        throw new ConflictException('Prefix already exists');
      }
    }

    // Upload new logo if provided
    let logoUrl: string | undefined;
    if (files?.logo && files.logo[0]) {
      const uploadResult = await this.uploadService.uploadImage(
        files.logo[0],
        'sellers/logos',
      );
      logoUrl = uploadResult.cdnUrl;

      // Optionally delete old logo
      // if (existingSeller.logo) {
      //   const oldKey = existingSeller.logo.split('.com/')[1];
      //   await this.uploadService.deleteFile(oldKey);
      // }
    }

    // Upload new stamp if provided
    let stampUrl: string | undefined;
    if (files?.stamp && files.stamp[0]) {
      const uploadResult = await this.uploadService.uploadImage(
        files.stamp[0],
        'sellers/stamps',
      );
      stampUrl = uploadResult.cdnUrl;

      // Optionally delete old stamp
      // if (existingSeller.stamp) {
      //   const oldKey = existingSeller.stamp.split('.com/')[1];
      //   await this.uploadService.deleteFile(oldKey);
      // }
    }

    // Extract banks from DTO
    const { banks, logo, stamp, ...sellerData } = updateSellerDto;

    // Validate banks if provided
    if (banks && banks.length > 0) {
      for (const bank of banks) {
        if (!bank.name || !bank.swift || !bank.address || !bank.accountNumberGEL) {
          throw new BadRequestException('Each bank must have name, swift, address, and accountNumberGEL');
        }
      }
    }

    // Use transaction to update seller and banks together
    const seller = await this.prisma.$transaction(async (tx) => {
      // Update seller data
      const updatedSeller = await tx.seller.update({
        where: { id },
        data: {
          ...sellerData,
          ...(logoUrl && { logo: logoUrl }),
          ...(stampUrl && { stamp: stampUrl }),
        },
      });

      // Handle banks if provided
      if (banks && banks.length > 0) {
        // Get existing banks for this seller
        const existingBanks = await tx.bank.findMany({
          where: {
            sellerId: id,
            deletedAt: null,
          },
        });

        // Track which banks are being updated
        const updatedBankIds: string[] = [];
        const hasDefault = banks.some(bank => bank.isDefault);
        let defaultSet = false;

        // Process each bank (create or update)
        for (const bank of banks) {
          if (bank.id) {
            // Update existing bank
            updatedBankIds.push(bank.id);

            // If this bank should be default, unset others first
            if (bank.isDefault && !defaultSet) {
              await tx.bank.updateMany({
                where: {
                  sellerId: id,
                  isDefault: true,
                  id: { not: bank.id },
                },
                data: { isDefault: false },
              });
              defaultSet = true;
            }

            await tx.bank.update({
              where: { id: bank.id },
              data: {
                name: bank.name,
                swift: bank.swift,
                address: bank.address,
                accountNumberGEL: bank.accountNumberGEL,
                accountNumberUSD: bank.accountNumberUSD,
                accountNumberEUR: bank.accountNumberEUR,
                intermediaryBankName: bank.intermediaryBankName,
                intermediaryBankSwift: bank.intermediaryBankSwift,
                isDefault: bank.isDefault || false,
              },
            });
          } else {
            // Create new bank
            const newBank = await tx.bank.create({
              data: {
                sellerId: id,
                name: bank.name,
                swift: bank.swift,
                address: bank.address,
                accountNumberGEL: bank.accountNumberGEL,
                accountNumberUSD: bank.accountNumberUSD,
                accountNumberEUR: bank.accountNumberEUR,
                intermediaryBankName: bank.intermediaryBankName,
                intermediaryBankSwift: bank.intermediaryBankSwift,
                isDefault: hasDefault ? (bank.isDefault || false) : (existingBanks.length === 0 && !defaultSet),
              },
            });
            updatedBankIds.push(newBank.id);

            if (newBank.isDefault) {
              defaultSet = true;
            }
          }
        }

        // Soft delete banks that weren't included in the update
        // (optional - you can remove this if you want to keep all banks)
        // await tx.bank.updateMany({
        //   where: {
        //     sellerId: id,
        //     id: { notIn: updatedBankIds },
        //     deletedAt: null,
        //   },
        //   data: {
        //     deletedAt: new Date(),
        //     isDefault: false,
        //   },
        // });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: currentUserId,
          action: 'UPDATE',
          resource: 'SELLER',
          resourceId: id,
          details: `Updated seller: ${updatedSeller.name} (${updatedSeller.prefix})${banks ? ` with ${banks.length} bank(s)` : ''}`,
        },
      });

      // Return seller with banks
      return await tx.seller.findUnique({
        where: { id },
        include: {
          banks: {
            where: { deletedAt: null },
            orderBy: [
              { isDefault: 'desc' },
              { createdAt: 'desc' },
            ],
          },
        },
      });
    });

    return {
      success: true,
      message: 'Seller updated successfully',
      data: seller,
    };
  }

  async remove(id: string, currentUserId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    });

    if (!seller || seller.deletedAt) {
      throw new NotFoundException('Seller not found');
    }

    // Soft delete - allow deletion even if there are invoices
    await this.prisma.seller.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'DELETE',
        resource: 'SELLER',
        resourceId: id,
        details: `Soft deleted seller: ${seller.name} (${seller.prefix})`,
      },
    });

    return {
      success: true,
      message: 'Seller deleted successfully',
    };
  }
}
