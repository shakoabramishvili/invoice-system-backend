import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    const settings = await this.prisma.settings.findFirst();
    return {
      success: true,
      data: settings,
    };
  }

  async updateSettings(updateSettingsDto: any, currentUserId: string) {
    return {
      success: true,
      message: 'Settings updated successfully',
      data: {},
    };
  }
}
