-- Fix invoice enum column types
-- The previous migration incorrectly created columns as TEXT instead of using enum types

-- Step 1: Drop defaults
ALTER TABLE "invoices"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "paymentStatus" DROP DEFAULT;

-- Step 2: Fix status column to use InvoiceStatus enum
ALTER TABLE "invoices"
  ALTER COLUMN "status" TYPE "InvoiceStatus" USING "status"::"InvoiceStatus";

-- Step 3: Fix paymentStatus column to use PaymentStatus enum
ALTER TABLE "invoices"
  ALTER COLUMN "paymentStatus" TYPE "PaymentStatus" USING "paymentStatus"::"PaymentStatus";

-- Step 4: Fix discountType column to use DiscountType enum (nullable)
ALTER TABLE "invoices"
  ALTER COLUMN "discountType" TYPE "DiscountType" USING
    CASE
      WHEN "discountType" IS NULL THEN NULL
      ELSE "discountType"::"DiscountType"
    END;

-- Step 5: Restore defaults with correct enum values
ALTER TABLE "invoices"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"InvoiceStatus",
  ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID'::"PaymentStatus";
