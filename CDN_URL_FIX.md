# CDN URL Fix Documentation

## Issue
The CDN URLs were being generated incorrectly. The bucket name needs to be part of the subdomain, not the path.

## Before (Incorrect)
```
https://fra1.cdn.digitaloceanspaces.com/sellers/logos/uuid.png
```

## After (Correct)
```
https://interavia.fra1.cdn.digitaloceanspaces.com/sellers/logos/uuid.png
```

## Changes Made

### 1. Upload Service (src/modules/upload/upload.service.ts)

**Old Code (Line 71-73):**
```typescript
const cdnUrl = this.cdnUrl
  ? `${this.cdnUrl}/${key}`
  : url;
```

**New Code:**
```typescript
const cdnUrl = this.cdnUrl
  ? `https://${this.bucketName}.${this.cdnUrl.replace('https://', '')}/${key}`
  : url;
```

**Explanation:**
- Constructs CDN URL with bucket name as subdomain
- Removes `https://` from CDN URL if present
- Adds `https://` at the beginning
- Result: `https://{bucket}.{cdn_region}/{key}`

### 2. Environment Variables (.env)

**Old Format:**
```env
DO_SPACES_CDN_URL="https://fra1.cdn.digitaloceanspaces.com"
```

**New Format:**
```env
DO_SPACES_CDN_URL="fra1.cdn.digitaloceanspaces.com"
```

**Note:** Remove `https://` from the CDN URL. The service will add it automatically.

### 3. Updated Documentation

- `.env.example` - Updated with correct format
- `src/modules/upload/README.md` - Added CDN URL construction explanation

## Environment Configuration

### Correct .env Setup

```env
DO_SPACES_KEY="your-access-key"
DO_SPACES_SECRET="your-secret-key"
DO_SPACES_ENDPOINT="https://fra1.digitaloceanspaces.com"
DO_SPACES_REGION="fra1"
DO_SPACES_BUCKET="interavia"
DO_SPACES_CDN_URL="fra1.cdn.digitaloceanspaces.com"
```

### URL Construction Logic

1. **Bucket Name:** `interavia`
2. **CDN URL:** `fra1.cdn.digitaloceanspaces.com`
3. **File Key:** `sellers/logos/uuid.png`

**Result:**
```
https://interavia.fra1.cdn.digitaloceanspaces.com/sellers/logos/uuid.png
```

## Response Format

When uploading a file, the response now includes:

```json
{
  "url": "https://fra1.digitaloceanspaces.com/interavia/sellers/logos/uuid.png",
  "key": "sellers/logos/uuid.png",
  "cdnUrl": "https://interavia.fra1.cdn.digitaloceanspaces.com/sellers/logos/uuid.png"
}
```

- `url` - Direct Spaces URL
- `key` - File path in bucket
- `cdnUrl` - CDN URL (faster delivery)

## Testing

### Test Upload

Upload a file using any endpoint:
```bash
curl -X POST http://localhost:3000/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.png" \
  -F "folder=test"
```

### Verify CDN URL Format

The response should include:
```json
{
  "cdnUrl": "https://interavia.fra1.cdn.digitaloceanspaces.com/test/uuid.png"
}
```

### Access the File

Test the URL in browser:
```
https://interavia.fra1.cdn.digitaloceanspaces.com/test/uuid.png
```

Should display the uploaded image.

## Different Regions

The same logic applies to all regions:

### New York (nyc3)
```env
DO_SPACES_BUCKET="mybucket"
DO_SPACES_CDN_URL="nyc3.cdn.digitaloceanspaces.com"
```
**Result:** `https://mybucket.nyc3.cdn.digitaloceanspaces.com/path/file.png`

### San Francisco (sfo3)
```env
DO_SPACES_BUCKET="mybucket"
DO_SPACES_CDN_URL="sfo3.cdn.digitaloceanspaces.com"
```
**Result:** `https://mybucket.sfo3.cdn.digitaloceanspaces.com/path/file.png`

### Amsterdam (ams3)
```env
DO_SPACES_BUCKET="mybucket"
DO_SPACES_CDN_URL="ams3.cdn.digitaloceanspaces.com"
```
**Result:** `https://mybucket.ams3.cdn.digitaloceanspaces.com/path/file.png`

### Singapore (sgp1)
```env
DO_SPACES_BUCKET="mybucket"
DO_SPACES_CDN_URL="sgp1.cdn.digitaloceanspaces.com"
```
**Result:** `https://mybucket.sgp1.cdn.digitaloceanspaces.com/path/file.png`

### Frankfurt (fra1)
```env
DO_SPACES_BUCKET="mybucket"
DO_SPACES_CDN_URL="fra1.cdn.digitaloceanspaces.com"
```
**Result:** `https://mybucket.fra1.cdn.digitaloceanspaces.com/path/file.png`

## Migration Notes

If you have existing data with old CDN URLs in the database:

### Option 1: Update URLs in Database
Run a migration to update existing URLs:

```sql
UPDATE sellers
SET logo = REPLACE(logo,
  'https://fra1.cdn.digitaloceanspaces.com/',
  'https://interavia.fra1.cdn.digitaloceanspaces.com/'
)
WHERE logo LIKE 'https://fra1.cdn.digitaloceanspaces.com/%';

UPDATE sellers
SET stamp = REPLACE(stamp,
  'https://fra1.cdn.digitaloceanspaces.com/',
  'https://interavia.fra1.cdn.digitaloceanspaces.com/'
)
WHERE stamp LIKE 'https://fra1.cdn.digitaloceanspaces.com/%';
```

### Option 2: Re-upload Files
Simply update the seller with new files. The new uploads will have correct URLs.

## Verification Checklist

✅ `.env` has CDN_URL without `https://`
✅ Upload service constructs URL with bucket subdomain
✅ Test upload returns correct CDN URL format
✅ CDN URL is accessible in browser
✅ Database saves correct CDN URLs

## Support

If CDN URLs are not working:
1. Verify CDN is enabled in Digital Ocean Spaces
2. Check bucket name matches `.env` configuration
3. Ensure files have `public-read` ACL
4. Test direct Spaces URL first, then CDN URL
5. Check CORS settings if accessing from frontend
