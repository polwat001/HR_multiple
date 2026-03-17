-- Merge data from holidays -> public_holidays without data loss
-- This script:
-- 1) Backs up holidays and public_holidays
-- 2) Ensures required columns exist
-- 3) Inserts non-duplicate rows from holidays into public_holidays
-- 4) Leaves holidays table intact (drop is done separately after verification)

SET @db_name := DATABASE();
SET @backup_suffix := '20260317';

-- Ensure destination table exists
CREATE TABLE IF NOT EXISTS public_holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  holiday_date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_id INT NULL,
  INDEX idx_public_holidays_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure minimal columns required by this migration
ALTER TABLE public_holidays ADD COLUMN IF NOT EXISTS holiday_date DATE NULL;
ALTER TABLE public_holidays ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL;
ALTER TABLE public_holidays ADD COLUMN IF NOT EXISTS company_id INT NULL;

-- Ensure source columns exist where possible
-- (if source table is missing, these statements are skipped by dynamic SQL below)
SET @has_holidays := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'holidays'
);

SET @sql := IF(@has_holidays = 1, 'ALTER TABLE holidays ADD COLUMN IF NOT EXISTS date DATE NULL', 'SELECT ''skip: holidays not found'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_holidays = 1, 'ALTER TABLE holidays ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL', 'SELECT ''skip: holidays not found'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_holidays = 1, 'ALTER TABLE holidays ADD COLUMN IF NOT EXISTS company_id INT NULL', 'SELECT ''skip: holidays not found'' AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backup destination table
SET @sql := 'CREATE TABLE IF NOT EXISTS public_holidays_bak_20260317 LIKE public_holidays';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := 'TRUNCATE TABLE public_holidays_bak_20260317';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := 'INSERT INTO public_holidays_bak_20260317 SELECT * FROM public_holidays';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backup source table if exists
SET @sql := IF(
  @has_holidays = 1,
  'CREATE TABLE IF NOT EXISTS holidays_bak_20260317 LIKE holidays',
  'SELECT ''skip: holidays backup not required'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @has_holidays = 1,
  'TRUNCATE TABLE holidays_bak_20260317',
  'SELECT ''skip: holidays backup not required'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  @has_holidays = 1,
  'INSERT INTO holidays_bak_20260317 SELECT * FROM holidays',
  'SELECT ''skip: holidays backup not required'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Merge rows only when source exists
SET @merge_sql := IF(
  @has_holidays = 1,
  'INSERT INTO public_holidays (holiday_date, name, company_id)
   SELECT h.date, h.name, h.company_id
   FROM holidays h
   LEFT JOIN public_holidays p
     ON p.holiday_date = h.date
    AND IFNULL(p.company_id, -1) = IFNULL(h.company_id, -1)
    AND p.name COLLATE utf8mb4_unicode_ci = h.name COLLATE utf8mb4_unicode_ci
   WHERE p.id IS NULL
     AND h.date IS NOT NULL
     AND COALESCE(h.name, '''') <> ''''',
  'SELECT ''skip: no holidays table to merge'' AS info'
);
PREPARE stmt FROM @merge_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT ROW_COUNT() AS inserted_rows;

-- Verification
SELECT 'public_holidays_total' AS metric, COUNT(*) AS value FROM public_holidays
UNION ALL
SELECT 'holidays_total', COUNT(*) FROM holidays WHERE @has_holidays = 1
UNION ALL
SELECT 'holidays_backup_total', COUNT(*) FROM holidays_bak_20260317 WHERE @has_holidays = 1
UNION ALL
SELECT 'public_holidays_backup_total', COUNT(*) FROM public_holidays_bak_20260317;

-- Note:
-- If verification is correct, you can drop holidays in a separate controlled step.
