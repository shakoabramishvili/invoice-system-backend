import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsNumber, IsBoolean, IsOptional, IsDateString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType } from '@prisma/client';
import { CreatePassengerDto } from './create-passenger.dto';
import { CreateProductDto } from './create-product.dto';

export class CreateInvoiceDto {
  @ApiProperty({ example: 'uuid-of-seller' })
  @IsUUID()
  sellerId: string;

  @ApiProperty({ example: 'uuid-of-buyer' })
  @IsUUID()
  buyerId: string;

  @ApiProperty({ example: '2024-12-01', description: 'Invoice issue date' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ example: '2024-12-01', required: false })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiProperty({ example: 355.00 })
  @IsNumber()
  @Type(() => Number)
  subtotal: number;

  @ApiProperty({ enum: DiscountType, required: false })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountValue?: number;

  @ApiProperty({ example: 35.50, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountAmount?: number;

  @ApiProperty({ example: 319.50 })
  @IsNumber()
  @Type(() => Number)
  totalAfterDiscount: number;

  @ApiProperty({ example: 'USD', default: 'USD' })
  @IsString()
  currencyFrom: string;

  @ApiProperty({ example: 3.245, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  exchangeRate?: number;

  @ApiProperty({ example: 'GEL', required: false })
  @IsOptional()
  @IsString()
  currencyTo?: string;

  @ApiProperty({ example: 1037.00 })
  @IsNumber()
  @Type(() => Number)
  grandTotal: number;

  @ApiProperty({ default: true })
  @IsBoolean()
  showLogo: boolean;

  @ApiProperty({ default: true })
  @IsBoolean()
  showStamp: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiProperty({ type: [CreatePassengerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreatePassengerDto)
  passengers: CreatePassengerDto[];

  @ApiProperty({ type: [CreateProductDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateProductDto)
  products: CreateProductDto[];
}
