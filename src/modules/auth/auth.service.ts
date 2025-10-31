import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser && !existingUser.deletedAt) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await argon2.hash(registerDto.password);

    const user = await this.prisma.user.create({
      data: {
        fullName: registerDto.fullName,
        email: registerDto.email,
        password: hashedPassword,
        phone: registerDto.phone,
        role: registerDto.role || 'OPERATOR',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        email: user.email,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        status: 'REGISTERED',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        ...tokens,
      },
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user || user.deletedAt) {
      await this.prisma.loginHistory.create({
        data: {
          email: loginDto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          status: 'FAILED',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(user.password, loginDto.password);

    if (!isPasswordValid) {
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          email: loginDto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          status: 'FAILED',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      await this.prisma.loginHistory.create({
        data: {
          userId: user.id,
          email: loginDto.email,
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          status: 'INACTIVE',
        },
      });
      throw new UnauthorizedException('Account is inactive');
    }

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        email: user.email,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        status: 'SUCCESS',
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    const { password, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        ...tokens,
      },
    };
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  async refreshTokens(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
    );

    return {
      success: true,
      message: 'Tokens refreshed successfully',
      data: tokens,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    return {
      success: true,
      data: user,
    };
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '7d',
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
