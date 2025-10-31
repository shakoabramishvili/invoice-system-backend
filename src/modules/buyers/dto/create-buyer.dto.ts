import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { LegalType } from '@prisma/client';

export class CreateBuyerDto {
  @ApiProperty({
    enum: LegalType,
    example: LegalType.LEGAL_ENTITY,
    description: 'Legal type of the buyer (INDIVIDUAL or LEGAL_ENTITY)'
  })
  @IsEnum(LegalType)
  @IsNotEmpty()
  legalType: LegalType;

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
    description: 'Company name or person full name'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

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
    description: 'Company tax ID or personal ID number'
  })
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty({
    example: 'John Smith',
    description: 'Contact person name'
  })
  @IsString()
  @IsNotEmpty()
  contactPerson: string;

  @ApiProperty({
    example: 'contact@gff.ge',
    description: 'Email address'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '+995555123456',
    description: 'Phone number'
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: '123 Main Street, Tbilisi',
    description: 'Full address'
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: 'Georgia',
    default: 'Georgia',
    description: 'Country name'
  })
  @IsString()
  @IsOptional()
  country?: string = 'Georgia';
}
