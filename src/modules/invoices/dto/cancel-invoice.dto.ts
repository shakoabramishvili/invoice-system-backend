import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CancelInvoiceDto {
  @ApiProperty({ example: 'Customer requested cancellation' })
  @IsString()
  cancelReason: string;
}
