import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  /**
   * Process data received from n8n webhook
   */
  async processN8nData(data: any): Promise<any> {
    this.logger.log('Processing data from n8n webhook');
    this.logger.debug(`Received data: ${JSON.stringify(data)}`);

    try {
      // Process the data here
      // You can add your business logic based on what n8n sends

      // Example: If n8n sends parsed CSV data, you can process it here
      // If it's an array of records, you might want to save them to database

      return {
        processed: true,
        receivedAt: new Date().toISOString(),
        recordCount: Array.isArray(data) ? data.length : 1,
        data: data,
      };
    } catch (error) {
      this.logger.error(`Failed to process n8n data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle file processing result from n8n
   */
  async handleFileProcessingResult(result: any): Promise<any> {
    this.logger.log('Handling file processing result from n8n');

    try {
      // Add your logic here to handle the processed file data
      // For example, you might want to:
      // - Save to database
      // - Trigger notifications
      // - Update records
      // - etc.

      return {
        success: true,
        message: 'File processing result handled successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to handle file processing result: ${error.message}`);
      throw error;
    }
  }
}
