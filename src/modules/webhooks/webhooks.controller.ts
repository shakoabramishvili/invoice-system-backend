import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('n8n')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive data from n8n webhook' })
  @ApiResponse({
    status: 200,
    description: 'Data received and processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  async receiveFromN8n(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log('Received webhook call from n8n');
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    this.logger.debug(`Data: ${JSON.stringify(data)}`);

    const result = await this.webhooksService.processN8nData(data);

    return {
      success: true,
      message: 'Webhook data received successfully',
      data: result,
    };
  }

  @Post('n8n/file-processed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive file processing result from n8n' })
  @ApiResponse({
    status: 200,
    description: 'File processing result received successfully',
  })
  async receiveFileProcessed(
    @Body() data: any,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log('Received file processing result from n8n');
    this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
    this.logger.debug(`Data: ${JSON.stringify(data)}`);

    const result = await this.webhooksService.handleFileProcessingResult(data);

    return {
      success: true,
      message: 'File processing result received successfully',
      data: result,
    };
  }
}
