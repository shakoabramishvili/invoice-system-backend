-- AlterTable - Make buyerId optional and add legalType
ALTER TABLE "invoices" ALTER COLUMN "buyerId" DROP NOT NULL;
ALTER TABLE "invoices" ADD COLUMN "legalType" "LegalType" NOT NULL DEFAULT 'LEGAL_ENTITY';
