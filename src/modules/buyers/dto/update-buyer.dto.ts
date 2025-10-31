import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { LegalType } from '@prisma/client';

export class UpdateBuyerDto {
  @ApiProperty({
    enum: LegalType,
    example: LegalType.LEGAL_ENTITY,
    required: false,
    description: 'Legal type of the buyer (INDIVIDUAL or LEGAL_ENTITY)'
  })
  @IsOptional()
  @IsEnum(LegalType)
  legalType?: LegalType;

  @ApiProperty({
    example: 'GFF',
    required: false,
    description: 'Buyer prefix identifier (e.g., GFF)'
  })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty({
    example: 'Georgian Freight Forwarders LLC',
    required: false,
    description: 'Company name or person full name'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'საქართველოს სატრანსპორტო კომპანია',
    required: false,
    description: 'Local language name'
  })
  @IsOptional()
  @IsString()
  nameLocal?: string;

  @ApiProperty({
    example: '123456789',
    required: false,
    description: 'Company tax ID or personal ID number'
  })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiProperty({
    example: 'John Smith',
    required: false,
    description: 'Contact person name'
  })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({
    example: 'contact@gff.ge',
    required: false,
    description: 'Email address'
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '+995555123456',
    required: false,
    description: 'Phone number'
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: '123 Main Street, Tbilisi',
    required: false,
    description: 'Full address'
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'Georgia',
    required: false,
    description: 'Country name'
  })
  @IsOptional()
  @IsString()
  country?: string;
}
