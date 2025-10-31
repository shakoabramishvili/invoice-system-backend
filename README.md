# Invoice Platform Backend

Complete invoice management system built with NestJS, PostgreSQL, and Prisma.

## Tech Stack

- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Authentication**: JWT with Argon2 password hashing
- **Validation**: class-validator + class-transformer
- **API Documentation**: Swagger/OpenAPI
- **PDF Generation**: Puppeteer
- **Package Manager**: yarn

## Features

- ✅ JWT Authentication with refresh tokens
- ✅ Role-based access control (ADMIN, OPERATOR, VIEWER)
- ✅ User management with activity logging
- ✅ Seller management with bank accounts
- ✅ Buyer management (companies and individuals) with soft delete
- ✅ Bank account management with intermediary bank support
- ✅ Invoice management with automatic numbering algorithm
- ✅ Multi-currency support with exchange rates
- ✅ Invoice PDF generation with Georgian language support
- ✅ Dashboard with KPIs and statistics
- ✅ Reports and exports (CSV/PDF)
- ✅ Activity logging and login history
- ✅ Settings management

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- yarn package manager

## Installation

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and update the database connection string and other settings:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/invoice_platform?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGIN="http://localhost:3001"
```

### 3. Set up the database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE invoice_platform;"

# Generate Prisma Client
yarn prisma generate

# Run migrations
yarn prisma migrate dev
```

### 4. Run the application

```bash
# Development mode
yarn start:dev

# Production mode
yarn build
yarn start:prod
```

The application will be running at:
- **API**: http://localhost:3000/api
- **Swagger Documentation**: http://localhost:3000/api

## API Endpoints

### Authentication (`/api/auth/`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `POST /refresh` - Refresh access token
- `GET /me` - Get current user

### Users (`/api/users/`) - Admin only
- `GET /` - Get all users (with pagination and filters)
- `GET /:id` - Get user by ID
- `POST /` - Create new user
- `PATCH /:id` - Update user
- `PATCH /:id/status` - Update user status
- `DELETE /:id` - Delete user

### Sellers (`/api/sellers/`)
- `GET /` - Get all sellers
- `GET /:id` - Get seller by ID
- `POST /` - Create new seller (Admin only)
- `PATCH /:id` - Update seller (Admin only)
- `DELETE /:id` - Delete seller (Admin only)

### Buyers (`/api/buyers/`)
- `GET /` - Get all buyers
- `GET /:id` - Get buyer by ID
- `POST /` - Create new buyer
- `PATCH /:id` - Update buyer
- `DELETE /:id` - Soft delete buyer

### Banks (`/api/banks/`)
- `GET /` - Get all banks
- `GET /seller/:sellerId` - Get banks by seller
- `GET /:id` - Get bank by ID
- `POST /` - Create new bank
- `PATCH /:id` - Update bank
- `PATCH /:id/default` - Set bank as default
- `DELETE /:id` - Soft delete bank

### Invoices (`/api/invoices/`)
- `GET /` - Get all invoices (with filters)
- `GET /canceled` - Get canceled invoices
- `GET /:id` - Get invoice by ID
- `GET /:id/pdf` - Download invoice PDF
- `POST /` - Create new invoice
- `PATCH /:id` - Update invoice
- `PATCH /:id/status` - Update invoice status
- `PATCH /:id/payment-status` - Update payment status
- `POST /:id/cancel` - Cancel invoice
- `DELETE /:id` - Soft delete invoice

### Dashboard (`/api/dashboard/`)
- `GET /stats` - Get KPIs (total invoices, revenue, etc.)
- `GET /revenue` - Get revenue chart (6 months)
- `GET /status` - Get invoice status distribution
- `GET /recent` - Get recent invoices (10)
- `GET /activity` - Get recent activity logs (20)

### Reports (`/api/reports/`)
- `GET /sales-by-month` - Monthly sales report
- `GET /sales-by-buyer` - Sales by buyer report
- `GET /sales-by-seller` - Sales by seller report
- `GET /overdue` - Overdue invoices report
- `POST /export` - Export report (CSV/PDF)

### Settings (`/api/settings/`) - Admin only
- `GET /` - Get settings
- `PATCH /` - Update settings
- `GET /activity-logs` - Get activity logs (paginated)
- `GET /login-history` - Get login history (paginated)

## Invoice Numbering Algorithm

Invoices are automatically numbered based on seller and buyer prefixes:

1. Get seller prefix (e.g., "IA" for Interavia, "AC" for Interco)
2. Get buyer prefix (e.g., "GFF" for Georgian Football Federation, or null)
3. Combine: `${sellerPrefix}${buyerPrefix || ''}`
4. Find last invoice number for this seller
5. Increment and pad to 4 digits

**Examples:**
- Interavia + GFF buyer: `IAGFF0001`, `IAGFF0002`...
- Interavia + regular buyer: `IA0001`, `IA0002`...
- Interco + any buyer: `AC0001`, `AC0002`...

## Database Schema

The system uses the following main entities:

- **User** - System users with roles and authentication
- **RefreshToken** - JWT refresh tokens
- **Seller** - Companies that issue invoices (Interavia, Interco)
- **Buyer** - Companies or individuals receiving invoices
- **Bank** - Bank accounts linked to sellers
- **Invoice** - Main invoice entity with all financial data
- **Passenger** - Passengers linked to invoices
- **Product** - Line items/products in invoices
- **Settings** - System-wide settings
- **ActivityLog** - User activity tracking
- **LoginHistory** - Login attempt tracking

## Security

- Passwords hashed with Argon2
- JWT-based authentication with access and refresh tokens
- Role-based access control
- Activity logging for audit trail
- Input validation on all endpoints
- CORS configuration

## Development

```bash
# Run in development mode with hot reload
yarn start:dev

# Run tests
yarn test

# Run e2e tests
yarn test:e2e

# Generate Prisma Client after schema changes
yarn prisma generate

# Create new migration
yarn prisma migrate dev --name migration_name

# View database in Prisma Studio
yarn prisma studio
```

## Production Deployment

1. Build the application:
```bash
yarn build
```

2. Run migrations:
```bash
yarn prisma migrate deploy
```

3. Start the production server:
```bash
yarn start:prod
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret key for JWT | - |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3001` |

## License

Proprietary - All rights reserved
