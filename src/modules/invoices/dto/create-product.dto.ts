import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Flight Ticket: Tbilisi - Dubai' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'TBS-DXB', required: false })
  @IsOptional()
  @IsString()
  direction?: string;

  @ApiProperty({ example: '2024-12-01', required: false })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiProperty({ example: '2024-12-01', required: false })
  @IsOptional()
  @IsDateString()
  arrivalDate?: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 350.00 })
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 350.00 })
  @IsNumber()
  @Type(() => Number)
  total: number;
}
