import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateBankDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', description: 'Seller ID' })
  @IsUUID()
  @IsNotEmpty()
  sellerId: string;

  @ApiProperty({ example: 'Bank of Georgia', description: 'Bank name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'BAGAGE22', description: 'SWIFT/BIC code' })
  @IsString()
  @IsNotEmpty()
  swift: string;

  @ApiProperty({
    example: '3 Pushkin Street, Tbilisi 0105, Georgia',
    description: 'Bank address'
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'GE29NB0000000101904917', description: 'Account number / IBAN in GEL' })
  @IsString()
  @IsNotEmpty()
  accountNumberGEL: string;

  @ApiProperty({ example: 'GE29NB0000000101904918', description: 'Account number / IBAN in USD', required: false })
  @IsOptional()
  @IsString()
  accountNumberUSD?: string;

  @ApiProperty({ example: 'GE29NB0000000101904919', description: 'Account number / IBAN in EUR', required: false })
  @IsOptional()
  @IsString()
  accountNumberEUR?: string;

  @ApiProperty({
    example: 'JP Morgan Chase Bank',
    description: 'Intermediary bank name',
    required: false
  })
  @IsOptional()
  @IsString()
  intermediaryBankName?: string;

  @ApiProperty({
    example: 'CHASUS33',
    description: 'Intermediary bank SWIFT code',
    required: false
  })
  @IsOptional()
  @IsString()
  intermediaryBankSwift?: string;

  @ApiProperty({
    example: false,
    description: 'Set as default bank for seller',
    required: false,
    default: false
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
