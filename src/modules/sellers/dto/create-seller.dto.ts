import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsEnum, IsOptional, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LegalType } from '@prisma/client';
import { BankNestedDto } from './bank-nested.dto';

export class CreateSellerDto {
  @ApiProperty({ enum: LegalType, default: LegalType.LEGAL_ENTITY, description: 'Legal type of the seller' })
  @IsEnum(LegalType)
  legalType: LegalType;

  @ApiProperty({ example: 'IA', description: 'Unique prefix for invoice numbering (e.g., IA, AC)', maxLength: 10 })
  @IsString()
  @MaxLength(10)
  prefix: string;

  @ApiProperty({ example: 'Interavia LLC', description: 'Company name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ინტერავია შპს', required: false, description: 'Local name' })
  @IsOptional()
  @IsString()
  nameLocal?: string;

  @ApiProperty({ example: '123456789', description: 'Tax identification number' })
  @IsString()
  taxId: string;

  @ApiProperty({ example: 'John Doe', description: 'Contact person name' })
  @IsString()
  contactPerson: string;

  @ApiProperty({ example: 'contact@interavia.ge', description: 'Contact email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+995555123456', description: 'Contact phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '123 Main Street, Tbilisi, Georgia', description: 'Full address' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Georgia', description: 'Country', default: 'Georgia' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Logo image file' })
  @IsOptional()
  logo?: any;

  @ApiProperty({ type: 'string', format: 'binary', required: false, description: 'Stamp image file' })
  @IsOptional()
  stamp?: any;

  @ApiProperty({
    type: 'string',
    required: false,
    description: 'JSON string of bank accounts array (when using multipart/form-data)',
    example: JSON.stringify([{
      name: 'Bank of Georgia',
      swift: 'BAGAGE22',
      address: '3 Pushkin Street',
      accountNumberGEL: 'GE29NB0000000101904917',
      accountNumberUSD: 'GE29NB0000000101904918',
      accountNumberEUR: 'GE29NB0000000101904919',
      isDefault: true
    }])
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    }
    return Array.isArray(value) ? value : undefined;
  })
  banks?: any[];
}
