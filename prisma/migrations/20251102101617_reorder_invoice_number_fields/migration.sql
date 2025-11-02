-- This migration reorders the invoice numbering fields in the Prisma schema
-- Note: Physical column order in PostgreSQL doesn't affect functionality
-- The Prisma schema has been reordered with prefix, year, serial before invoiceNumber
-- No actual database changes are needed as all columns already exist

-- Verify columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'prefix') THEN
        RAISE EXCEPTION 'Column prefix does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'year') THEN
        RAISE EXCEPTION 'Column year does not exist';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'invoices' AND column_name = 'serial') THEN
        RAISE EXCEPTION 'Column serial does not exist';
    END IF;
END $$;
