-- AlterTable: Make gender optional in passengers table
ALTER TABLE "passengers" ALTER COLUMN "gender" DROP NOT NULL;

-- AlterTable: Add passengerId to products table
ALTER TABLE "products" ADD COLUMN "passengerId" TEXT;

-- CreateIndex: Add index on passengerId in products
CREATE INDEX "products_passengerId_idx" ON "products"("passengerId");

-- AddForeignKey: Add foreign key from products to passengers
ALTER TABLE "products" ADD CONSTRAINT "products_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "passengers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Add useSeparateInvoiceNumbering to buyers table
ALTER TABLE "buyers" ADD COLUMN "useSeparateInvoiceNumbering" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add buyerSequence to invoices table
ALTER TABLE "invoices" ADD COLUMN "buyerSequence" INTEGER;

-- CreateIndex: Add unique constraint on buyerId, year, and buyerSequence
CREATE UNIQUE INDEX "invoices_buyerId_year_buyerSequence_key" ON "invoices"("buyerId", "year", "buyerSequence");
