-- Recreate passengers table with isMain column after birthDate

-- Create new table with correct column order
CREATE TABLE "passengers_new" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "invoiceId" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passengers_new_pkey" PRIMARY KEY ("id")
);

-- Copy data from old table
INSERT INTO "passengers_new" (
    "id", "legacyId", "invoiceId", "gender", "firstName", "lastName",
    "birthDate", "isMain", "createdAt", "updatedAt"
)
SELECT
    "id", "legacyId", "invoiceId", "gender", "firstName", "lastName",
    "birthDate", "isMain", "createdAt", "updatedAt"
FROM "passengers";

-- Drop old table
DROP TABLE "passengers";

-- Rename new table
ALTER TABLE "passengers_new" RENAME TO "passengers";

-- Recreate unique constraint
CREATE UNIQUE INDEX "passengers_legacyId_key" ON "passengers"("legacyId");

-- Recreate index
CREATE INDEX "passengers_invoiceId_idx" ON "passengers"("invoiceId");

-- Recreate foreign key
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
