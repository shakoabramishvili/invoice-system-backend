# Using Swagger to Create/Update Sellers with Files

This guide explains how to use Swagger UI to create or update sellers with logo, stamp, and bank information.

## Step-by-Step Guide

### 1. Access Swagger UI

Navigate to: `http://localhost:3000/api`

### 2. Authenticate

1. Click the **"Authorize"** button at the top right
2. Enter your JWT token: `Bearer YOUR_JWT_TOKEN`
3. Click **"Authorize"** and then **"Close"**

### 3. Create Seller with Files

#### Navigate to POST /sellers endpoint

1. Find **POST /sellers** in the Sellers section
2. Click **"Try it out"**

#### Fill in the Form Fields

**Required fields:**
- `legalType`: Select `LEGAL_ENTITY` or `INDIVIDUAL`
- `prefix`: Enter unique prefix (e.g., "IA", "AC")
- `name`: Company name
- `taxId`: Tax identification number
- `contactPerson`: Contact person name
- `email`: Email address
- `phone`: Phone number
- `address`: Full address

**Optional fields:**
- `nameLocal`: Local language name
- `country`: Country (defaults to "Georgia")
- `logo`: Click "Choose File" and select logo image
- `stamp`: Click "Choose File" and select stamp image
- `banks`: JSON string of bank array (see below)

#### Adding Banks (Optional)

In the `banks` field, enter a JSON string like this:

```json
[
  {
    "name": "Bank of Georgia",
    "swift": "BAGAGE22",
    "address": "3 Pushkin Street, Tbilisi",
    "accountNumber": "GE29NB0000000101904917",
    "intermediaryBankName": "JP Morgan Chase Bank",
    "intermediaryBankSwift": "CHASUS33",
    "isDefault": true
  }
]
```

**Important:**
- It must be a valid JSON string
- Use double quotes for property names and string values
- The entire array must be on one line or properly formatted JSON

#### Example banks field:

**Single line (easiest for Swagger):**
```
[{"name":"Bank of Georgia","swift":"BAGAGE22","address":"3 Pushkin Street","accountNumber":"GE29NB0000000101904917","isDefault":true}]
```

**Multiple banks:**
```
[{"name":"Bank of Georgia","swift":"BAGAGE22","address":"3 Pushkin Street","accountNumber":"GE29NB0000000101904917","isDefault":true},{"name":"TBC Bank","swift":"TBCBGE22","address":"7 Marjanishvili Street","accountNumber":"GE64TB0000000123456789","isDefault":false}]
```

#### Click Execute

After filling in all required fields and optionally uploading files and adding banks, click the **"Execute"** button.

### 4. Update Seller with Files

#### Navigate to PATCH /sellers/{id} endpoint

1. Find **PATCH /sellers/{id}** in the Sellers section
2. Click **"Try it out"**
3. Enter the seller `id` in the path parameter

#### Fill in Fields to Update

You only need to fill in the fields you want to update. For example:

**To update only the logo:**
- Leave all other fields empty
- Select a new logo file in the `logo` field
- Click "Execute"

**To update name and stamp:**
- Enter new name in `name` field
- Select new stamp file in `stamp` field
- Click "Execute"

**To add/update banks:**
- Enter banks JSON in the `banks` field
- Include `id` for existing banks you want to update
- Omit `id` for new banks

Example updating banks:
```json
[
  {
    "id": "existing-bank-uuid-here",
    "name": "Updated Bank Name",
    "swift": "BAGAGE22",
    "address": "Updated Address",
    "accountNumber": "GE29NB0000000101904917",
    "isDefault": true
  },
  {
    "name": "New Bank",
    "swift": "TBCBGE22",
    "address": "New Bank Address",
    "accountNumber": "GE64TB0000000123456789",
    "isDefault": false
  }
]
```

## Common Issues and Solutions

### Issue: Validation errors for banks

**Solution:** Make sure the banks field is a valid JSON string with all required fields. Common mistakes:
- Using single quotes instead of double quotes
- Missing commas between array items
- Invalid JSON syntax
- Missing required fields (name, swift, address, accountNumber)

**Valid:**
```json
[{"name":"Bank Name","swift":"SWIFT","address":"Address","accountNumber":"123","isDefault":true}]
```

**Invalid:**
```json
[{'name':'Bank Name'}]  // Wrong: single quotes
[{name:"Bank Name"}]    // Wrong: no quotes on property name
[{"name":"Bank"}]       // Wrong: missing required fields (swift, address, accountNumber)
```

### Required Fields for Each Bank:
- `name` (string) - Bank name
- `swift` (string) - SWIFT/BIC code
- `address` (string) - Bank address
- `accountNumber` (string) - Account number/IBAN

### Optional Fields for Each Bank:
- `id` (string, UUID) - For updating existing banks
- `intermediaryBankName` (string)
- `intermediaryBankSwift` (string)
- `isDefault` (boolean) - Default: false

### Issue: File upload fails

**Solutions:**
- Make sure the file is an image (JPEG, PNG, GIF, WebP)
- Check that the file size is under 10MB
- Ensure you've authorized with a valid JWT token

### Issue: "Prefix already exists"

**Solution:** Choose a different, unique prefix for the seller.

## Tips for Using Swagger

1. **Leave fields empty if not updating:** When updating, only fill in fields you want to change
2. **Use JSON validators:** Validate your banks JSON using online tools like jsonlint.com before pasting
3. **One-line JSON:** Format your banks JSON as a single line for easier pasting in Swagger
4. **Check response:** After execution, check the response body to verify your data was saved correctly

## Creating Banks JSON String

### Using Online Tool

1. Write your JSON normally:
```json
[
  {
    "name": "Bank of Georgia",
    "swift": "BAGAGE22",
    "address": "3 Pushkin Street",
    "accountNumber": "GE29NB0000000101904917",
    "isDefault": true
  }
]
```

2. Use an online JSON minifier (like jsonformatter.org/json-minifier)
3. Copy the minified result
4. Paste into Swagger

### Using JavaScript Console

```javascript
const banks = [
  {
    name: "Bank of Georgia",
    swift: "BAGAGE22",
    address: "3 Pushkin Street",
    accountNumber: "GE29NB0000000101904917",
    isDefault: true
  }
];

console.log(JSON.stringify(banks));
// Copy the output and paste into Swagger
```

## Example: Complete Create Seller Request

**Form Fields:**
```
legalType: LEGAL_ENTITY
prefix: IA
name: Interavia LLC
nameLocal: ინტერავია შპს
taxId: 123456789
contactPerson: John Doe
email: contact@interavia.ge
phone: +995555123456
address: 123 Main Street, Tbilisi, Georgia
country: Georgia
logo: [Choose File: logo.png]
stamp: [Choose File: stamp.png]
banks: [{"name":"Bank of Georgia","swift":"BAGAGE22","address":"3 Pushkin Street, Tbilisi","accountNumber":"GE29NB0000000101904917","isDefault":true}]
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Seller created successfully",
  "data": {
    "id": "uuid-here",
    "legalType": "LEGAL_ENTITY",
    "prefix": "IA",
    "name": "Interavia LLC",
    "nameLocal": "ინტერავია შპს",
    "taxId": "123456789",
    "contactPerson": "John Doe",
    "email": "contact@interavia.ge",
    "phone": "+995555123456",
    "address": "123 Main Street, Tbilisi, Georgia",
    "country": "Georgia",
    "logo": "https://fra1.cdn.digitaloceanspaces.com/sellers/logos/uuid.png",
    "stamp": "https://fra1.cdn.digitaloceanspaces.com/sellers/stamps/uuid.png",
    "createdAt": "2025-10-21T10:00:00.000Z",
    "updatedAt": "2025-10-21T10:00:00.000Z",
    "deletedAt": null,
    "banks": [
      {
        "id": "bank-uuid",
        "name": "Bank of Georgia",
        "swift": "BAGAGE22",
        "address": "3 Pushkin Street, Tbilisi",
        "accountNumber": "GE29NB0000000101904917",
        "isDefault": true,
        "createdAt": "2025-10-21T10:00:00.000Z",
        "updatedAt": "2025-10-21T10:00:00.000Z"
      }
    ]
  }
}
```

## Testing Without Files

If you don't want to upload files, simply:
1. Don't select any files for `logo` and `stamp`
2. Leave the banks field empty if you don't want to add banks
3. Fill in only the required fields
4. Click Execute

This will create a seller without logo, stamp, or banks.
