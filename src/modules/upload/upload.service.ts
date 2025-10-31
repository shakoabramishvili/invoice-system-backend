import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private endpoint: string;
  private cdnUrl: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('DO_SPACES_BUCKET');
    this.region = this.configService.get<string>('DO_SPACES_REGION');
    this.endpoint = this.configService.get<string>('DO_SPACES_ENDPOINT');
    this.cdnUrl = this.configService.get<string>('DO_SPACES_CDN_URL');

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('DO_SPACES_KEY'),
        secretAccessKey: this.configService.get<string>('DO_SPACES_SECRET'),
      },
      forcePathStyle: false,
    });
  }

  /**
   * Upload a file to Digital Ocean Spaces
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
    isPublic: boolean = true,
  ): Promise<{ url: string; key: string; cdnUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size (max 10MB by default)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `${folder}/${fileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ACL: isPublic ? 'public-read' : 'private',
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
        },
      });

      await this.s3Client.send(command);

      // Construct URLs
      const url = `${this.endpoint}/${this.bucketName}/${key}`;
      const cdnUrl = this.cdnUrl
        ? `https://${this.bucketName}.${this.cdnUrl.replace('https://', '')}/${key}`
        : url;

      return {
        url,
        key,
        cdnUrl,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
    isPublic: boolean = true,
  ): Promise<Array<{ url: string; key: string; cdnUrl: string }>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) =>
      this.uploadFile(file, folder, isPublic),
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Digital Ocean Spaces
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map((key) => this.deleteFile(key));
    await Promise.all(deletePromises);
  }

  /**
   * Get a pre-signed URL for private files
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      throw new BadRequestException(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Validate file type
   */
  validateFileType(file: Express.Multer.File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Upload image with validation
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'images',
  ): Promise<{ url: string; key: string; cdnUrl: string }> {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!this.validateFileType(file, allowedImageTypes)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed');
    }

    return this.uploadFile(file, folder, true);
  }

  /**
   * Upload document with validation
   */
  async uploadDocument(
    file: Express.Multer.File,
    folder: string = 'documents',
  ): Promise<{ url: string; key: string; cdnUrl: string }> {
    const allowedDocTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!this.validateFileType(file, allowedDocTypes)) {
      throw new BadRequestException('Invalid file type. Only PDF, DOC, DOCX, XLS, and XLSX documents are allowed');
    }

    return this.uploadFile(file, folder, true);
  }
}
