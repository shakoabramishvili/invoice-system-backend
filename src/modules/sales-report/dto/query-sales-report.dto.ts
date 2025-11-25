import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySalesReportDto {
  @ApiPropertyOptional({ description: 'Filter by invoice number' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Search by passenger name' })
  @IsOptional()
  @IsString()
  passenger?: string;

  @ApiPropertyOptional({ description: 'Filter by buyer name' })
  @IsOptional()
  @IsString()
  buyer?: string;

  @ApiPropertyOptional({ description: 'Filter by provider' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: 'Filter by product name' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: 'Filter by issue date from' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  issueDateFrom?: Date;

  @ApiPropertyOptional({ description: 'Filter by issue date to' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  issueDateTo?: Date;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term for multiple fields' })
  @IsOptional()
  @IsString()
  search?: string;
}
