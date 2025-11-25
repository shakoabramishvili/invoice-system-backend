import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsNumber,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSalesReportDto {
  @ApiProperty({ description: 'Issue date', example: '2024-01-15T00:00:00Z' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  issueDate: Date;

  @ApiPropertyOptional({ description: 'Product name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  productName?: string;

  @ApiPropertyOptional({ description: 'Ticket number', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ticketNumber?: string;

  @ApiPropertyOptional({ description: 'PNR', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pnr?: string;

  @ApiPropertyOptional({ description: 'Airline company', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  airlineCompany?: string;

  @ApiPropertyOptional({ description: 'Passenger name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  passenger?: string;

  @ApiPropertyOptional({ description: 'Destination', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  destination?: string;

  @ApiPropertyOptional({
    description: 'Departure/Arrival date',
    example: '2024-01-20T00:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  departureArrivalDate?: Date;

  @ApiPropertyOptional({ description: 'Fare amount', example: 500.0 })
  @IsOptional()
  @IsNumber()
  fare?: number;

  @ApiPropertyOptional({ description: 'Net amount', example: 450.0 })
  @IsOptional()
  @IsNumber()
  net?: number;

  @ApiPropertyOptional({ description: 'Service fee', example: 50.0 })
  @IsOptional()
  @IsNumber()
  serviceFee?: number;

  @ApiPropertyOptional({ description: 'Total amount', example: 500.0 })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Invoice number', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Provider', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  provider?: string;

  @ApiProperty({ description: 'User ID who created this record' })
  @IsNotEmpty()
  @IsUUID()
  createdBy: string;

  @ApiPropertyOptional({ description: 'Buyer name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  buyer?: string;

  @ApiPropertyOptional({ description: 'Comment' })
  @IsOptional()
  @IsString()
  comment?: string;
}
