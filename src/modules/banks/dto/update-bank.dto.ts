import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateBankDto {
  @ApiProperty({ example: 'Bank of Georgia', description: 'Bank name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'BAGAGE22', description: 'SWIFT/BIC code', required: false })
  @IsOptional()
  @IsString()
  swift?: string;

  @ApiProperty({
    example: '3 Pushkin Street, Tbilisi 0105, Georgia',
    description: 'Bank address',
    required: false
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: 'GE29NB0000000101904917', description: 'Account number / IBAN in GEL', required: false })
  @IsOptional()
  @IsString()
  accountNumberGEL?: string;

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
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
