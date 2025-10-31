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

  @ApiProperty({ example: 'GE29NB0000000101904917', description: 'Account number / IBAN', required: false })
  @IsOptional()
  @IsString()
  accountNumber?: string;

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
