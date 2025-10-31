import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CreateSellerDto } from './create-seller.dto';
import { BankNestedDto } from './bank-nested.dto';

export class UpdateSellerDto extends PartialType(CreateSellerDto) {
  @ApiProperty({
    type: 'string',
    required: false,
    description: 'JSON string of bank accounts array (when using multipart/form-data). Include id for updates, omit for new banks',
    example: JSON.stringify([{
      id: 'existing-bank-uuid',
      name: 'Bank of Georgia',
      swift: 'BAGAGE22',
      address: '3 Pushkin Street',
      accountNumber: 'GE29NB0000000101904917',
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
