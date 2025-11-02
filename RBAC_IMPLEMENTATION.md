# Role-Based Access Control (RBAC) Implementation

## Overview
This document outlines the RBAC implementation for the Invoice System Backend with three roles:
- **ADMIN**: Full access to all operations
- **OPERATOR**: Limited write access (cannot create/edit/delete users)
- **VIEWER**: Read-only access (GET requests only)

## Implementation Status

### ✅ Core Infrastructure (COMPLETED)
1. **Roles Decorator** (`src/common/decorators/roles.decorator.ts`)
   - Decorator to specify allowed roles for endpoints

2. **RolesGuard** (`src/common/guards/roles.guard.ts`)
   - Provides context-aware error messages based on the action and resource
   - Examples:
     - POST /invoices → "You do not have access to create invoice"
     - DELETE /invoices/123 → "You do not have access to delete invoice"
     - PATCH /users/456 → "You do not have access to edit user"
     - GET /settings → "You do not have access to view settings"
   - Checks if user has required role before allowing access

### ✅ Users Module (COMPLETED)
- CREATE: `@Roles(Role.ADMIN)` - Admin only
- READ: `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)` - All roles can view users
- UPDATE: `@Roles(Role.ADMIN)` - Admin only
- DELETE: `@Roles(Role.ADMIN)` - Admin only
- Profile Picture Upload/Remove: `@Roles(Role.ADMIN, Role.OPERATOR)`

### ✅ Auth Module (NO CHANGES NEEDED)
- Register, Login, Logout, Refresh, Get Me - Public or authenticated users only

### ✅ Invoices Module (COMPLETED)
- CREATE: `@Roles(Role.ADMIN, Role.OPERATOR)`
- GET /invoices: `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- GET /invoices/export: `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- GET /invoices/canceled/export: `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- GET /invoices/canceled: `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- GET /invoices/:id/pdf: `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- GET /invoices/:id: `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- PATCH /invoices/:id: `@Roles(Role.ADMIN, Role.OPERATOR)`
- PATCH /invoices/:id/status: `@Roles(Role.ADMIN, Role.OPERATOR)`
- PATCH /invoices/:id/payment-status: `@Roles(Role.ADMIN, Role.OPERATOR)`
- POST /invoices/:id/cancel: `@Roles(Role.ADMIN, Role.OPERATOR)`
- DELETE /invoices/:id: `@Roles(Role.ADMIN)`

### ✅ Sellers Module (COMPLETED)
- CREATE: `@Roles(Role.ADMIN, Role.OPERATOR)`
- READ (GET): `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- UPDATE: `@Roles(Role.ADMIN, Role.OPERATOR)`
- DELETE: `@Roles(Role.ADMIN, Role.OPERATOR)`

### ✅ Buyers Module (COMPLETED)
- CREATE: `@Roles(Role.ADMIN, Role.OPERATOR)`
- READ (GET): `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- UPDATE: `@Roles(Role.ADMIN, Role.OPERATOR)`
- DELETE: `@Roles(Role.ADMIN, Role.OPERATOR)`

### ✅ Banks Module (COMPLETED)
- CREATE: `@Roles(Role.ADMIN, Role.OPERATOR)`
- READ (GET): `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- UPDATE: `@Roles(Role.ADMIN, Role.OPERATOR)`
- DELETE: `@Roles(Role.ADMIN, Role.OPERATOR)`

### ✅ Dashboard Module (COMPLETED)
- ALL (READ ONLY): `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`

### ✅ Reports Module (COMPLETED)
- ALL (READ ONLY): `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`

### ✅ Settings Module (COMPLETED)
- READ (GET): `@Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER)`
- UPDATE: `@Roles(Role.ADMIN)`

### ✅ Upload Module (COMPLETED)
- ALL UPLOAD ENDPOINTS: `@Roles(Role.ADMIN, Role.OPERATOR)`
- ALL DELETE ENDPOINTS: `@Roles(Role.ADMIN, Role.OPERATOR)`

## Implementation Steps for Each Controller

For each controller, add these imports:
```typescript
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
```

Update `@UseGuards`:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
```

Add `@Roles()` decorator before each endpoint's `@ApiOperation()`.

## Testing RBAC

Test each role's access:

1. **ADMIN** - Should have full access
2. **OPERATOR** - Should:
   - ✅ Create/Read/Update invoices, sellers, buyers, banks
   - ✅ Upload files
   - ✅ View dashboard and reports
   - ✅ View users (read-only)
   - ❌ Create/Edit/Delete users
   - ❌ Delete invoices
   - ❌ Update settings

3. **VIEWER** - Should:
   - ✅ View all resources (GET requests)
   - ❌ Create, Update, or Delete anything

## Error Response
When a user lacks permission, they receive a context-aware error message:

**Examples:**
```json
// POST /api/invoices
{
  "statusCode": 403,
  "message": "You do not have access to create invoice",
  "error": "Forbidden"
}

// DELETE /api/invoices/123
{
  "statusCode": 403,
  "message": "You do not have access to delete invoice",
  "error": "Forbidden"
}

// PATCH /api/users/456
{
  "statusCode": 403,
  "message": "You do not have access to edit user",
  "error": "Forbidden"
}

// PATCH /api/settings
{
  "statusCode": 403,
  "message": "You do not have access to edit settings",
  "error": "Forbidden"
}
```
