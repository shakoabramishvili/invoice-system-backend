import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsNumber, IsBoolean, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType, LegalType } from '@prisma/client';
import { CreatePassengerDto } from './create-passenger.dto';
import { CreateProductDto } from './create-product.dto';

export class UpdateInvoiceDto {
  @ApiProperty({ example: 'uuid-of-seller', required: false })
  @IsOptional()
  @IsUUID()
  sellerId?: string;

  @ApiProperty({ example: 'uuid-of-buyer', required: false })
  @IsOptional()
  @IsUUID()
  buyerId?: string;

  @ApiProperty({ example: 'uuid-of-bank', required: false, description: 'Bank account ID' })
  @IsOptional()
  @IsUUID()
  bankId?: string;

  @ApiProperty({ enum: LegalType, required: false })
  @IsOptional()
  @IsEnum(LegalType)
  legalType?: LegalType;

  @ApiProperty({ example: '2024-12-01', description: 'Invoice issue date', required: false })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiProperty({ example: '2024-12-01', required: false })
  @IsOptional()
  @IsDateString()
  departureDate?: string;

  @ApiProperty({ example: 355.00, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  subtotal?: number;

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

  @ApiProperty({ example: 319.50, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalAfterDiscount?: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currencyFrom?: string;

  @ApiProperty({ example: 3.245, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  exchangeRate?: number;

  @ApiProperty({ example: 'GEL', required: false })
  @IsOptional()
  @IsString()
  currencyTo?: string;

  @ApiProperty({ example: 1037.00, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  grandTotal?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showLogo?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showStamp?: boolean;

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

  @ApiProperty({ type: [CreatePassengerDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePassengerDto)
  passengers?: CreatePassengerDto[];

  @ApiProperty({ type: [CreateProductDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products?: CreateProductDto[];
}
