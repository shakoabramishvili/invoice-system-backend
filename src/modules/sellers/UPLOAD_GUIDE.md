# Seller Logo and Stamp Upload Guide

This guide explains how to upload logo and stamp images when creating or updating sellers.

## Overview

When creating or updating a seller, you can now upload:
- **Logo** - Company logo image
- **Stamp** - Company stamp/seal image

Both files are optional and will be uploaded to Digital Ocean Spaces with the URLs saved in the database.

## API Endpoints

### Create Seller with Files

**Endpoint:** `POST /sellers`

**Content-Type:** `multipart/form-data`

**Authentication:** Required (Admin role)

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| legalType | string | Yes | LEGAL_ENTITY or INDIVIDUAL |
| prefix | string | Yes | Unique prefix (e.g., "IA", "AC") |
| name | string | Yes | Company name |
| nameLocal | string | No | Local language name |
| taxId | string | Yes | Tax identification number |
| contactPerson | string | Yes | Contact person name |
| email | string | Yes | Contact email |
| phone | string | Yes | Contact phone |
| address | string | Yes | Full address |
| country | string | No | Country (default: "Georgia") |
| logo | file | No | Logo image (JPEG, PNG, GIF, WebP) |
| stamp | file | No | Stamp image (JPEG, PNG, GIF, WebP) |
| banks | JSON | No | Array of bank objects |

**Example using cURL:**

```bash
curl -X POST http://localhost:3000/sellers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "legalType=LEGAL_ENTITY" \
  -F "prefix=IA" \
  -F "name=Interavia LLC" \
  -F "taxId=123456789" \
  -F "contactPerson=John Doe" \
  -F "email=contact@interavia.ge" \
  -F "phone=+995555123456" \
  -F "address=123 Main Street, Tbilisi" \
  -F "logo=@/path/to/logo.png" \
  -F "stamp=@/path/to/stamp.png"
```

**Example using JavaScript (FormData):**

```javascript
const formData = new FormData();
formData.append('legalType', 'LEGAL_ENTITY');
formData.append('prefix', 'IA');
formData.append('name', 'Interavia LLC');
formData.append('taxId', '123456789');
formData.append('contactPerson', 'John Doe');
formData.append('email', 'contact@interavia.ge');
formData.append('phone', '+995555123456');
formData.append('address', '123 Main Street, Tbilisi');

// Add logo file
const logoFile = document.getElementById('logo-input').files[0];
if (logoFile) {
  formData.append('logo', logoFile);
}

// Add stamp file
const stampFile = document.getElementById('stamp-input').files[0];
if (stampFile) {
  formData.append('stamp', stampFile);
}

const response = await fetch('http://localhost:3000/sellers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
console.log(result);
```

**Response:**

```json
{
  "success": true,
  "message": "Seller created successfully",
  "data": {
    "id": "uuid-here",
    "legalType": "LEGAL_ENTITY",
    "prefix": "IA",
    "name": "Interavia LLC",
    "taxId": "123456789",
    "contactPerson": "John Doe",
    "email": "contact@interavia.ge",
    "phone": "+995555123456",
    "address": "123 Main Street, Tbilisi",
    "country": "Georgia",
    "logo": "https://fra1.cdn.digitaloceanspaces.com/sellers/logos/uuid.png",
    "stamp": "https://fra1.cdn.digitaloceanspaces.com/sellers/stamps/uuid.png",
    "createdAt": "2025-10-21T10:00:00.000Z",
    "updatedAt": "2025-10-21T10:00:00.000Z",
    "deletedAt": null,
    "banks": []
  }
}
```

### Update Seller with Files

**Endpoint:** `PATCH /sellers/:id`

**Content-Type:** `multipart/form-data`

**Authentication:** Required (Admin role)

**Form Fields:** Same as create, but all fields are optional

**Example using cURL:**

```bash
curl -X PATCH http://localhost:3000/sellers/uuid-here \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=Updated Company Name" \
  -F "logo=@/path/to/new-logo.png"
```

**Example using JavaScript:**

```javascript
const formData = new FormData();
formData.append('name', 'Updated Company Name');

// Update logo only
const newLogo = document.getElementById('logo-input').files[0];
if (newLogo) {
  formData.append('logo', newLogo);
}

const response = await fetch(`http://localhost:3000/sellers/${sellerId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});
```

## File Upload Details

### Accepted File Types
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### File Size Limit
- Maximum: 10MB per file

### Storage Structure

Files are organized in Digital Ocean Spaces as follows:

```
interavia/
├── sellers/
│   ├── logos/
│   │   ├── uuid1.png
│   │   ├── uuid2.jpg
│   │   └── ...
│   └── stamps/
│       ├── uuid1.png
│       ├── uuid2.jpg
│       └── ...
```

### CDN URLs

Uploaded files are accessible via CDN for faster delivery:

```
https://fra1.cdn.digitaloceanspaces.com/sellers/logos/uuid.png
https://fra1.cdn.digitaloceanspaces.com/sellers/stamps/uuid.png
```

## Important Notes

1. **File uploads are optional** - You can create/update sellers without uploading files
2. **Old files are kept** - When updating with a new logo/stamp, the old files remain in storage (commented code shows how to delete them)
3. **Unique filenames** - Files are automatically renamed using UUID to prevent conflicts
4. **CDN URLs saved** - The database stores the CDN URL for faster file delivery
5. **Image validation** - Only image files are accepted (JPEG, PNG, GIF, WebP)

## Frontend Implementation Tips

### React Example

```jsx
import { useState } from 'react';

function CreateSellerForm() {
  const [formData, setFormData] = useState({
    legalType: 'LEGAL_ENTITY',
    prefix: '',
    name: '',
    taxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  });
  const [logo, setLogo] = useState(null);
  const [stamp, setStamp] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();

    // Append all form fields
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });

    // Append files if selected
    if (logo) data.append('logo', logo);
    if (stamp) data.append('stamp', stamp);

    const response = await fetch('http://localhost:3000/sellers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: data,
    });

    const result = await response.json();
    console.log(result);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Regular form inputs */}
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Company Name"
        required
      />

      {/* File inputs */}
      <div>
        <label>Logo:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setLogo(e.target.files[0])}
        />
      </div>

      <div>
        <label>Stamp:</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setStamp(e.target.files[0])}
        />
      </div>

      <button type="submit">Create Seller</button>
    </form>
  );
}
```

### Vue.js Example

```vue
<template>
  <form @submit.prevent="submitForm">
    <input v-model="form.name" placeholder="Company Name" required />

    <div>
      <label>Logo:</label>
      <input type="file" @change="onLogoChange" accept="image/*" />
    </div>

    <div>
      <label>Stamp:</label>
      <input type="file" @change="onStampChange" accept="image/*" />
    </div>

    <button type="submit">Create Seller</button>
  </form>
</template>

<script>
export default {
  data() {
    return {
      form: {
        legalType: 'LEGAL_ENTITY',
        prefix: '',
        name: '',
        taxId: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
      },
      logo: null,
      stamp: null,
    };
  },
  methods: {
    onLogoChange(event) {
      this.logo = event.target.files[0];
    },
    onStampChange(event) {
      this.stamp = event.target.files[0];
    },
    async submitForm() {
      const formData = new FormData();

      Object.keys(this.form).forEach(key => {
        formData.append(key, this.form[key]);
      });

      if (this.logo) formData.append('logo', this.logo);
      if (this.stamp) formData.append('stamp', this.stamp);

      const response = await fetch('http://localhost:3000/sellers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.$store.state.token}`,
        },
        body: formData,
      });

      const result = await response.json();
      console.log(result);
    },
  },
};
</script>
```

## Troubleshooting

### Error: "Invalid file type"
- Make sure you're uploading an image file (JPEG, PNG, GIF, or WebP)

### Error: "File size exceeds 10MB limit"
- Compress or resize the image before uploading

### Error: "Failed to upload file"
- Check Digital Ocean Spaces credentials in `.env`
- Verify the bucket name and region are correct
- Ensure the Spaces has proper CORS configuration

### Files not showing
- Verify the CDN URL is correctly configured
- Check that the file was actually uploaded to Digital Ocean Spaces
- Ensure the file has public-read ACL permission
