import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreatePassengerDto {
  @ApiProperty({ enum: Gender, example: Gender.MR })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '1990-01-15', required: false })
  @IsOptional()
  @IsDateString()
  birthDate?: string;
}
