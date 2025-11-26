import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class N8nService {
  private readonly webhookUrl: string;

  constructor(private configService: ConfigService) {
    // Allow webhook URL to be configured via environment variable, with fallback to hardcoded URL
    this.webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL') || 'https://n8n.interavia.us/webhook/csv-parse';
  }

  /**
   * Send a file to n8n webhook
   */
  async sendFileToWebhook(file: Express.Multer.File): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const formData = new FormData();

      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
        knownLength: file.size,
      });

      const response = await axios.post(this.webhookUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      
      // Return the array from the wrapper
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(
          `Failed to send file to n8n webhook: ${error.response?.data?.message || error.message}`,
        );
      }
      throw new BadRequestException(`Failed to send file to n8n webhook: ${error.message}`);
    }
  }

  /**
   * Send multiple files to n8n webhook
   */
  async sendFilesToWebhook(files: Express.Multer.File[]): Promise<any[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) => this.sendFileToWebhook(file));
    return Promise.all(uploadPromises);
  }
}
