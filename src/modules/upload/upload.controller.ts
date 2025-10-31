import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeleteFileDto } from './dto/delete-file.dto';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('single')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          default: 'uploads',
          description: 'Folder name in the bucket',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.uploadService.uploadFile(
      file,
      folder || 'uploads',
      true,
    );

    return {
      success: true,
      message: 'File uploaded successfully',
      data: result,
    };
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        folder: {
          type: 'string',
          default: 'uploads',
          description: 'Folder name in the bucket',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results = await this.uploadService.uploadFiles(
      files,
      folder || 'uploads',
      true,
    );

    return {
      success: true,
      message: `${results.length} files uploaded successfully`,
      data: results,
    };
  }

  @Post('image')
  @ApiOperation({ summary: 'Upload an image file (JPEG, PNG, GIF, WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          default: 'images',
          description: 'Folder name in the bucket',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.uploadService.uploadImage(
      file,
      folder || 'images',
    );

    return {
      success: true,
      message: 'Image uploaded successfully',
      data: result,
    };
  }

  @Post('document')
  @ApiOperation({ summary: 'Upload a document (PDF, DOC, DOCX, XLS, XLSX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          default: 'documents',
          description: 'Folder name in the bucket',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.uploadService.uploadDocument(
      file,
      folder || 'documents',
    );

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: result,
    };
  }

  @Delete('file')
  @ApiOperation({ summary: 'Delete a file by key' })
  async deleteFile(@Body() deleteFileDto: DeleteFileDto) {
    await this.uploadService.deleteFile(deleteFileDto.key);

    return {
      success: true,
      message: 'File deleted successfully',
    };
  }

  @Delete('files')
  @ApiOperation({ summary: 'Delete multiple files by keys' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: { type: 'string' },
          example: ['uploads/file1.jpg', 'uploads/file2.jpg'],
        },
      },
    },
  })
  async deleteFiles(@Body('keys') keys: string[]) {
    if (!keys || keys.length === 0) {
      throw new BadRequestException('No file keys provided');
    }

    await this.uploadService.deleteFiles(keys);

    return {
      success: true,
      message: `${keys.length} files deleted successfully`,
    };
  }
}
