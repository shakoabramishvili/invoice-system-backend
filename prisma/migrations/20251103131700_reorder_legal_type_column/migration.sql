-- Recreate invoices table with legalType column after paymentStatus

-- Drop foreign key constraints from dependent tables
ALTER TABLE "passengers" DROP CONSTRAINT IF EXISTS "passengers_invoiceId_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_invoiceId_fkey";

-- Create new table with correct column order
CREATE TABLE "invoices_new" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "prefix" TEXT,
    "year" TEXT,
    "serial" INTEGER,
    "invoiceNumber" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT,
    "bankId" TEXT,
    "createdBy" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT'::"InvoiceStatus",
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID'::"PaymentStatus",
    "legalType" "LegalType" NOT NULL DEFAULT 'LEGAL_ENTITY'::"LegalType",
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

    CONSTRAINT "invoices_temp_pkey" PRIMARY KEY ("id")
);

-- Copy data from old table
INSERT INTO "invoices_new" (
    "id", "legacyId", "prefix", "year", "serial", "invoiceNumber",
    "sellerId", "buyerId", "bankId", "createdBy",
    "status", "paymentStatus", "legalType",
    "issueDate", "dueDate", "departureDate",
    "subtotal", "discountType", "discountValue", "discountAmount", "totalAfterDiscount",
    "currencyFrom", "exchangeRate", "currencyTo", "grandTotal",
    "showLogo", "showStamp",
    "description", "notes", "termsAndConditions",
    "cancelReason", "canceledAt",
    "createdAt", "updatedAt", "deletedAt"
)
SELECT
    "id", "legacyId", "prefix", "year", "serial", "invoiceNumber",
    "sellerId", "buyerId", "bankId", "createdBy",
    "status", "paymentStatus", "legalType",
    "issueDate", "dueDate", "departureDate",
    "subtotal", "discountType", "discountValue", "discountAmount", "totalAfterDiscount",
    "currencyFrom", "exchangeRate", "currencyTo", "grandTotal",
    "showLogo", "showStamp",
    "description", "notes", "termsAndConditions",
    "cancelReason", "canceledAt",
    "createdAt", "updatedAt", "deletedAt"
FROM "invoices";

-- Drop old table
DROP TABLE "invoices";

-- Rename new table
ALTER TABLE "invoices_new" RENAME TO "invoices";

-- Recreate unique constraints
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE UNIQUE INDEX "invoices_legacyId_key" ON "invoices"("legacyId");
CREATE UNIQUE INDEX "invoices_year_serial_key" ON "invoices"("year", "serial");

-- Recreate indexes
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");
CREATE INDEX "invoices_buyerId_idx" ON "invoices"("buyerId");
CREATE INDEX "invoices_sellerId_idx" ON "invoices"("sellerId");

-- Recreate foreign keys
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Recreate foreign keys from dependent tables
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
