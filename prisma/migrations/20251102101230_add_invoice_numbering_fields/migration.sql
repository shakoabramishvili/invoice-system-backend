-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "prefix" TEXT,
ADD COLUMN     "year" TEXT,
ADD COLUMN     "serial" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_year_serial_key" ON "invoices"("year", "serial");
