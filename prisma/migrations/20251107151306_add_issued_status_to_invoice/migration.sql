-- Add ISSUED status to InvoiceStatus enum
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'ISSUED' AFTER 'DRAFT';
