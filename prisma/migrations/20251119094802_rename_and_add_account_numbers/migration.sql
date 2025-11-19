-- AlterTable
ALTER TABLE "banks" RENAME COLUMN "accountNumber" TO "accountNumberGEL";

-- AlterTable
ALTER TABLE "banks" ADD COLUMN "accountNumberUSD" TEXT;
ALTER TABLE "banks" ADD COLUMN "accountNumberEUR" TEXT;
