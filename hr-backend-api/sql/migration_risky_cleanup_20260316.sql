-- Risky cleanup migration for duplicate holiday tables
-- Date: 2026-03-16
-- Context:
-- Backend resolves holiday table with priority:
--   1) public_holidays
--   2) holidays (fallback)
-- If public_holidays exists, holidays is effectively unused at runtime.

-- IMPORTANT:
-- Run only after validating application reads and writes against public_holidays.
-- Keep backup table for rollback.

-- 1) Backup holidays table
CREATE TABLE IF NOT EXISTS holidays_bak_20260316 AS SELECT * FROM holidays;

-- 2) Optional integrity check between holidays and public_holidays
SELECT 'holidays' AS table_name, COUNT(*) AS rows_count FROM holidays
UNION ALL
SELECT 'public_holidays', COUNT(*) FROM public_holidays;

-- 3) Risky action: remove fallback table
DROP TABLE IF EXISTS holidays;

-- 4) Rollback reference (manual)
-- CREATE TABLE holidays AS SELECT * FROM holidays_bak_20260316;
