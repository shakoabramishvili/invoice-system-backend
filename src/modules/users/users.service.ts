import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(createUserDto: CreateUserDto, currentUserId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await argon2.hash(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'CREATE',
        resource: 'USER',
        resourceId: user.id,
        details: `Created user: ${user.email}`,
      },
    });

    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

  async findAll(page = 1, limit = 50, role?: string, status?: string, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          profilePicture: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        _count: {
          select: {
            invoices: true,
            activityLogs: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: user,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    const dataToUpdate: any = { ...updateUserDto };

    if (updateUserDto.password) {
      dataToUpdate.password = await argon2.hash(updateUserDto.password);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE',
        resource: 'USER',
        resourceId: id,
        details: `Updated user: ${user.email}`,
      },
    });

    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }

  async updateStatus(id: string, updateUserStatusDto: UpdateUserStatusDto, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: updateUserStatusDto.status },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE_STATUS',
        resource: 'USER',
        resourceId: id,
        details: `Changed user status to: ${updateUserStatusDto.status}`,
      },
    });

    return {
      success: true,
      message: 'User status updated successfully',
      data: updatedUser,
    };
  }

  async remove(id: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'DELETE',
        resource: 'USER',
        resourceId: id,
        details: `Soft deleted user: ${user.email}`,
      },
    });

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  async updateProfilePicture(id: string, file: Express.Multer.File, currentUserId: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException('User not found');
    }

    // Upload the new profile picture
    const uploadResult = await this.uploadService.uploadImage(
      file,
      'users/avatars',
    );

    // Update user with new profile picture URL
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        profilePicture: uploadResult.cdnUrl,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the activity
    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE',
        resource: 'USER',
        resourceId: id,
        details: `Updated profile picture for user: ${updatedUser.email}`,
      },
    });

    return {
      success: true,
      message: 'Profile picture updated successfully',
      data: updatedUser,
    };
  }

  async removeProfilePicture(id: string, currentUserId: string) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser || existingUser.deletedAt) {
      throw new NotFoundException('User not found');
    }

    if (!existingUser.profilePicture) {
      throw new BadRequestException('User does not have a profile picture');
    }

    // Update user to remove profile picture URL
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        profilePicture: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the activity
    await this.prisma.activityLog.create({
      data: {
        userId: currentUserId,
        action: 'UPDATE',
        resource: 'USER',
        resourceId: id,
        details: `Removed profile picture for user: ${updatedUser.email}`,
      },
    });

    return {
      success: true,
      message: 'Profile picture removed successfully',
      data: updatedUser,
    };
  }
}
