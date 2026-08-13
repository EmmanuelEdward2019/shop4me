-- Make deleting an auth.users row cascade-safe for EVERY user, so self-service
-- "Delete My Account" works for buyers, agents and riders.
--
-- Today several foreign keys to auth.users would BLOCK a delete:
--   • orders.user_id is `ON DELETE SET NULL` but the column is `NOT NULL`
--     (a contradiction → the delete errors out).
--   • some agent/rider columns are `NOT NULL` with no ON DELETE action
--     (NO ACTION → the delete errors out).
--
-- This scans every single-column FK referencing auth.users and repairs the
-- ones that would block a delete, preserving intent:
--   • SET NULL on a NOT NULL column  → drop NOT NULL (row is anonymized).
--   • NO ACTION / RESTRICT, nullable → convert to ON DELETE SET NULL (kept, anonymized).
--   • NO ACTION / RESTRICT, NOT NULL → convert to ON DELETE CASCADE (row removed).
-- FKs that already CASCADE, or SET NULL on a nullable column, are left as-is.
--
-- Structural only — it changes on-delete behaviour, it does not delete any data.
-- Idempotent: re-running finds nothing left to fix.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname,
           cl.relname       AS tbl,
           att.attname      AS col,
           att.attnotnull   AS notnull,
           con.confdeltype  AS deltype  -- a=no action, r=restrict, c=cascade, n=set null, d=set default
    FROM pg_constraint con
    JOIN pg_class cl      ON cl.oid = con.conrelid
    JOIN pg_namespace ns  ON ns.oid = cl.relnamespace
    JOIN pg_attribute att ON att.attrelid = con.conrelid
                         AND att.attnum   = con.conkey[1]
    WHERE con.contype = 'f'
      AND ns.nspname  = 'public'
      AND con.confrelid = 'auth.users'::regclass
      AND array_length(con.conkey, 1) = 1
  LOOP
    IF r.deltype = 'n' AND r.notnull THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
      RAISE NOTICE 'delete-safe: % .% dropped NOT NULL (SET NULL FK)', r.tbl, r.col;
    ELSIF r.deltype IN ('a', 'r') THEN
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.conname);
      IF r.notnull THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
          r.tbl, r.conname, r.col);
        RAISE NOTICE 'delete-safe: % .% -> ON DELETE CASCADE', r.tbl, r.col;
      ELSE
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL',
          r.tbl, r.conname, r.col);
        RAISE NOTICE 'delete-safe: % .% -> ON DELETE SET NULL', r.tbl, r.col;
      END IF;
    END IF;
  END LOOP;
END $$;
