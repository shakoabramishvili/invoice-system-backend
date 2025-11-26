import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { N8nService } from '../../common/services/n8n.service';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [UploadService, N8nService],
  exports: [UploadService, N8nService],
})
export class UploadModule {}
