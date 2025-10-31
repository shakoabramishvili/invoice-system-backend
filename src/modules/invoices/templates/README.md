# Invoice PDF Templates

This directory contains Handlebars templates for generating invoice PDFs.

## Available Templates

- `default-invoice.template.html` - Default Interavia invoice template with purple branding

## Creating a New Template

1. Create a new `.template.html` file in this directory (e.g., `my-template.template.html`)
2. Use Handlebars syntax for dynamic content
3. Use the template by passing its name (without `.template.html`) to the PDF endpoint:
   ```
   GET /api/invoices/:id/pdf?template=my-template
   ```

## Available Template Variables

### Invoice Data
- `invoiceNumber` - Invoice number (e.g., "IAGFF0001")
- `issueDate` - Issue date (YYYY-MM-DD format)
- `dueDate` - Due date (YYYY-MM-DD format)
- `showLogo` - Boolean, whether to show company logo
- `showStamp` - Boolean, whether to show company stamp

### Seller & Buyer
- `seller.name` - Seller company name
- `seller.identificationNumber` - Seller tax ID
- `seller.address` - Seller address
- `seller.phone` - Seller phone
- `buyer.name` - Buyer company name
- `buyer.identificationNumber` - Buyer tax ID
- `buyer.address` - Buyer address
- `buyer.phone` - Buyer phone

### Passengers
- `hasPassengers` - Boolean, whether invoice has passengers
- `passengers[]` - Array of passenger objects
  - `gender` - Passenger gender (MR, MS, etc.)
  - `firstName` - First name
  - `lastName` - Last name
  - `birthDate` - Birth date (YYYY-MM-DD format)

### Products/Services
- `products[]` - Array of product/service objects
  - `description` - Product description
  - `direction` - Travel direction (e.g., "TBS-PAR")
  - `dates` - Departure/Arrival dates (formatted)
  - `quantity` - Quantity
  - `price` - Unit price (formatted with 2 decimals)
  - `total` - Line total (formatted with 2 decimals)

### Totals & Currency
- `subtotal` - Subtotal amount (formatted)
- `currencyFrom` - Original currency code (e.g., "EUR")
- `hasDiscount` - Boolean, whether discount is applied
- `discountDisplay` - Discount display value (e.g., "10%" or "25.00")
- `discountCurrency` - Discount currency or "Price" for percentage
- `totalAfterDiscount` - Total after discount (formatted)
- `hasCurrencyConversion` - Boolean, whether currency conversion is applied
- `exchangeRate` - Exchange rate (formatted with 3 decimals)
- `currencyTo` - Target currency code (e.g., "GEL")
- `grandTotal` - Final total (formatted)

### Bank Information
- `bank.bankName` - Bank name
- `bank.swiftCode` - SWIFT code
- `bank.address` - Bank address
- `bank.accountGEL` - GEL account number (if exists)
- `bank.accountUSD` - USD account number (if exists)
- `bank.accountEUR` - EUR account number (if exists)
- `bank.intermediaryName` - Intermediary bank name (if exists)
- `bank.intermediarySwift` - Intermediary SWIFT code (if exists)

### Additional Fields
- `notes` - Invoice notes
- `termsAndConditions` - Terms and conditions text

## Handlebars Helpers

Use standard Handlebars helpers:

```handlebars
{{#if hasPassengers}}
  <!-- Show passengers table -->
{{/if}}

{{#each products}}
  <tr>
    <td>{{description}}</td>
    <td>{{price}}</td>
  </tr>
{{/each}}
```

## Styling

All CSS should be inline or in a `<style>` tag within the template, as the PDF is generated from the HTML using Puppeteer.

## Example Usage

```typescript
// Use default template
GET /api/invoices/123/pdf

// Use custom template
GET /api/invoices/123/pdf?template=my-custom-template
```
