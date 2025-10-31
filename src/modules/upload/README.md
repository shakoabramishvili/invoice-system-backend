# Upload Service - Digital Ocean Spaces

This module provides file upload functionality using Digital Ocean Spaces (S3-compatible object storage).

## Features

- Single and multiple file uploads
- Image upload with type validation (JPEG, PNG, GIF, WebP)
- Document upload with type validation (PDF, DOC, DOCX, XLS, XLSX)
- File deletion (single and bulk)
- Pre-signed URLs for private files
- CDN support for faster file delivery
- File size validation (max 10MB)
- Unique filename generation using UUID

## Setup

### 1. Digital Ocean Spaces Configuration

1. Create a Space in your Digital Ocean account
2. Generate Spaces access keys (API key and secret)
3. Note your Space name, region, and endpoint

### 2. Environment Variables

Add the following to your `.env` file:

```env
DO_SPACES_KEY="your-do-spaces-access-key"
DO_SPACES_SECRET="your-do-spaces-secret-key"
DO_SPACES_ENDPOINT="https://nyc3.digitaloceanspaces.com"
DO_SPACES_REGION="nyc3"
DO_SPACES_BUCKET="your-bucket-name"
DO_SPACES_CDN_URL="nyc3.cdn.digitaloceanspaces.com"
```

### 3. Available Regions

- `nyc3` - New York (https://nyc3.digitaloceanspaces.com)
- `sfo3` - San Francisco (https://sfo3.digitaloceanspaces.com)
- `ams3` - Amsterdam (https://ams3.digitaloceanspaces.com)
- `sgp1` - Singapore (https://sgp1.digitaloceanspaces.com)
- `fra1` - Frankfurt (https://fra1.digitaloceanspaces.com)

## API Endpoints

All endpoints require JWT authentication.

### Upload Single File

```http
POST /upload/single
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: (binary)
- folder: "uploads" (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://nyc3.digitaloceanspaces.com/bucket/uploads/uuid.jpg",
    "key": "uploads/uuid.jpg",
    "cdnUrl": "https://bucket.nyc3.cdn.digitaloceanspaces.com/uploads/uuid.jpg"
  }
}
```

### Upload Multiple Files

```http
POST /upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- files: (multiple files, max 10)
- folder: "uploads" (optional)
```

### Upload Image

```http
POST /upload/image
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: (binary - JPEG, PNG, GIF, or WebP only)
- folder: "images" (optional)
```

### Upload Document

```http
POST /upload/document
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- file: (binary - PDF, DOC, DOCX, XLS, or XLSX only)
- folder: "documents" (optional)
```

### Delete File

```http
DELETE /upload/file
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "key": "uploads/abc123.jpg"
}
```

### Delete Multiple Files

```http
DELETE /upload/files
Content-Type: application/json
Authorization: Bearer <token>

Body:
{
  "keys": ["uploads/file1.jpg", "uploads/file2.jpg"]
}
```

## Using the Upload Service in Other Modules

### Import the Module

```typescript
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [UploadModule],
  // ...
})
export class YourModule {}
```

### Inject the Service

```typescript
import { UploadService } from '../upload/upload.service';

@Injectable()
export class YourService {
  constructor(private uploadService: UploadService) {}

  async uploadSellerLogo(file: Express.Multer.File) {
    // Upload to 'sellers/logos' folder
    const result = await this.uploadService.uploadImage(file, 'sellers/logos');
    return result.cdnUrl; // Return CDN URL for faster delivery
  }

  async deleteSellerLogo(key: string) {
    await this.uploadService.deleteFile(key);
  }

  async getPrivateFileUrl(key: string) {
    // Generate a signed URL that expires in 1 hour
    const signedUrl = await this.uploadService.getSignedUrl(key, 3600);
    return signedUrl;
  }
}
```

### Controller Example

```typescript
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('sellers')
export class SellersController {
  constructor(private uploadService: UploadService) {}

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.uploadService.uploadImage(file, 'sellers/logos');

    // Update seller with logo URL in database
    // await this.sellersService.update(id, { logo: result.cdnUrl });

    return result;
  }
}
```

## File Organization Best Practices

Recommended folder structure:

```
/sellers/logos          - Seller company logos
/sellers/stamps         - Seller company stamps
/buyers/documents       - Buyer documents
/invoices/attachments   - Invoice attachments
/invoices/exports       - Generated PDF invoices
/users/avatars          - User profile pictures
/temp                   - Temporary files (should be cleaned up)
```

## Security Considerations

1. **File Size Limits**: Currently set to 10MB. Adjust in `upload.service.ts` if needed.
2. **File Type Validation**: Always validate file types to prevent malicious uploads.
3. **Authentication**: All endpoints require JWT authentication.
4. **Public vs Private**: Use `isPublic: false` for sensitive files and use pre-signed URLs.
5. **CORS**: Configure CORS in Digital Ocean Spaces if frontend needs direct upload.

## CDN Configuration

To enable CDN for faster file delivery:

1. In Digital Ocean Spaces settings, enable CDN
2. Note the CDN region (e.g., `nyc3.cdn.digitaloceanspaces.com`)
3. Update `DO_SPACES_CDN_URL` in your `.env` file (without https:// and without bucket name)
4. The service will automatically construct the full CDN URL as: `https://{bucket}.{cdn_url}/{key}`
5. Use `result.cdnUrl` instead of `result.url` in your application

**Example:**
```env
DO_SPACES_BUCKET="interavia"
DO_SPACES_CDN_URL="fra1.cdn.digitaloceanspaces.com"
```

**Result:**
```
https://interavia.fra1.cdn.digitaloceanspaces.com/sellers/logos/uuid.png
```

## Error Handling

Common errors:

- **"No file provided"** - File was not included in the request
- **"File size exceeds 10MB limit"** - File is too large
- **"Invalid file type"** - File type not allowed for the endpoint
- **"Failed to upload file"** - S3/Spaces connection or credential issue

## Testing

Use Postman, Insomnia, or curl to test uploads:

```bash
curl -X POST http://localhost:3000/upload/single \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "folder=test"
```

## Cost Optimization

- Use CDN to reduce bandwidth costs
- Implement file cleanup for temporary uploads
- Consider lifecycle policies in Digital Ocean Spaces
- Compress images before uploading when possible
