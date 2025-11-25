import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class DeleteSalesReportDto {
  @ApiProperty({ description: 'Array of sales report IDs to delete' })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
