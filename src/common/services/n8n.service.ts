import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class N8nService {
  private readonly webhookUrl: string;
  private readonly logger = new Logger(N8nService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
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

      // Get the data array from the response
      const responseData = response.data.data;

      // Update salesReport records in the background (non-blocking)
      this.updateSalesReportsFromN8nData(responseData).catch((error) => {
        this.logger.error(`Failed to update sales reports in background: ${error.message}`);
      });

      // Return the array from the wrapper
      return responseData;
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

  /**
   * Update salesReport records based on n8n response data
   * This runs in the background after receiving the response
   */
  private async updateSalesReportsFromN8nData(data: any[]): Promise<void> {
    if (!Array.isArray(data) || data.length === 0) {
      this.logger.warn('No data to update salesReports');
      return;
    }

    this.logger.log(`Starting background update of ${data.length} sales reports`);

    let successCount = 0;
    let failureCount = 0;

    for (const record of data) {
      try {
        // Extract fields from n8n response
        const documentNumber = record['Document Number'];
        const airlineCompany = record['Airline Name'];
        const netToBePaid = record['Net to be Paid'];

        if (!documentNumber) {
          this.logger.warn('Skipping record without Document Number');
          failureCount++;
          continue;
        }

        // Convert ticketNumber to string (n8n may return it as a number)
        const ticketNumber = documentNumber.toString();

        // Find salesReport by ticketNumber
        const salesReport = await this.prisma.salesReport.findFirst({
          where: {
            ticketNumber: ticketNumber,
            deletedAt: null,
          },
        });

        if (!salesReport) {
          this.logger.warn(`SalesReport not found for ticket number: ${ticketNumber}`);
          failureCount++;
          continue;
        }

        // Update the record
        await this.prisma.salesReport.update({
          where: { id: salesReport.id },
          data: {
            airlineCompany: airlineCompany || salesReport.airlineCompany,
            fare: netToBePaid ? parseFloat(netToBePaid) : salesReport.fare,
            net: netToBePaid ? parseFloat(netToBePaid) : salesReport.net,
          },
        });

        successCount++;
        this.logger.debug(`Updated salesReport for ticket number: ${ticketNumber}`);
      } catch (error) {
        failureCount++;
        this.logger.error(`Failed to update salesReport: ${error.message}`);
      }
    }

    this.logger.log(
      `Background update completed. Success: ${successCount}, Failed: ${failureCount}`,
    );
  }
}
