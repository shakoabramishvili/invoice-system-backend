import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteFileDto {
  @ApiProperty({
    example: 'uploads/abc123.jpg',
    description: 'The key/path of the file to delete',
  })
  @IsString()
  @IsNotEmpty()
  key: string;
}
