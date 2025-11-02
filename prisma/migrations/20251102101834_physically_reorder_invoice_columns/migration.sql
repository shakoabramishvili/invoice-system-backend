-- Physically reorder invoice columns in PostgreSQL
-- This migration recreates the invoices table with the correct column order

-- Step 1: Create new table with correct column order
CREATE TABLE "invoices_new" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,

    "prefix" TEXT,
    "year" TEXT,
    "serial" INTEGER,
    "invoiceNumber" TEXT NOT NULL,

    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "bankId" TEXT,
    "createdBy" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "departureDate" TIMESTAMP(3),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(9,2),
    "discountAmount" DECIMAL(10,2),
    "totalAfterDiscount" DECIMAL(10,2) NOT NULL,
    "currencyFrom" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DECIMAL(10,6),
    "currencyTo" TEXT,
    "grandTotal" DECIMAL(10,2) NOT NULL,
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "showStamp" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "cancelReason" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoices_new_pkey" PRIMARY KEY ("id")
);

-- Step 2: Copy all data from old table to new table
INSERT INTO "invoices_new" (
    "id", "legacyId", "prefix", "year", "serial", "invoiceNumber",
    "sellerId", "buyerId", "bankId", "createdBy", "status", "paymentStatus",
    "issueDate", "dueDate", "departureDate", "subtotal", "discountType",
    "discountValue", "discountAmount", "totalAfterDiscount", "currencyFrom",
    "exchangeRate", "currencyTo", "grandTotal", "showLogo", "showStamp",
    "description", "notes", "termsAndConditions", "cancelReason", "canceledAt",
    "createdAt", "updatedAt", "deletedAt"
)
SELECT
    "id", "legacyId", "prefix", "year", "serial", "invoiceNumber",
    "sellerId", "buyerId", "bankId", "createdBy", "status", "paymentStatus",
    "issueDate", "dueDate", "departureDate", "subtotal", "discountType",
    "discountValue", "discountAmount", "totalAfterDiscount", "currencyFrom",
    "exchangeRate", "currencyTo", "grandTotal", "showLogo", "showStamp",
    "description", "notes", "termsAndConditions", "cancelReason", "canceledAt",
    "createdAt", "updatedAt", "deletedAt"
FROM "invoices";

-- Step 3: Drop foreign key constraints on related tables
ALTER TABLE "passengers" DROP CONSTRAINT IF EXISTS "passengers_invoiceId_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_invoiceId_fkey";

-- Step 4: Drop old table
DROP TABLE "invoices";

-- Step 5: Rename new table to original name
ALTER TABLE "invoices_new" RENAME TO "invoices";

-- Step 6: Create all constraints
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_legacyId_key" UNIQUE ("legacyId");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoiceNumber_key" UNIQUE ("invoiceNumber");
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_year_serial_key" UNIQUE ("year", "serial");

-- Step 7: Add foreign key constraints
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 8: Recreate foreign keys on related tables
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Create indexes
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");
CREATE INDEX "invoices_buyerId_idx" ON "invoices"("buyerId");
CREATE INDEX "invoices_sellerId_idx" ON "invoices"("sellerId");
