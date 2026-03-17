-- Cleanup legacy tables with backup (safe mode)
-- Target legacy tables:
-- - modules
-- - role_permissions
-- - employment_history
--
-- Behavior:
-- 1) Create backup table (LIKE + INSERT) if source exists
-- 2) Drop source only when there are no FK references to it
-- 3) Print execution summary

SET @db_name := DATABASE();

DROP TEMPORARY TABLE IF EXISTS cleanup_summary;
CREATE TEMPORARY TABLE cleanup_summary (
  table_name VARCHAR(120) NOT NULL,
  action VARCHAR(120) NOT NULL,
  details VARCHAR(1000) NOT NULL
);

-- ===== role_permissions (drop child first) =====
SET @has_role_permissions := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'role_permissions'
);

SET @role_permissions_fk_ref := (
  SELECT COUNT(*) FROM information_schema.key_column_usage
  WHERE referenced_table_schema = @db_name
    AND referenced_table_name = 'role_permissions'
    AND table_name NOT IN ('modules', 'role_permissions', 'employment_history')
);

SET @sql := IF(@has_role_permissions = 1, 'CREATE TABLE IF NOT EXISTS role_permissions_bak_20260317 LIKE role_permissions', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_role_permissions = 1, 'TRUNCATE TABLE role_permissions_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_role_permissions = 1, 'INSERT INTO role_permissions_bak_20260317 SELECT * FROM role_permissions', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_role_permissions = 1 AND @role_permissions_fk_ref = 0, 'DROP TABLE role_permissions', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO cleanup_summary
SELECT
  'role_permissions',
  CASE
    WHEN @has_role_permissions = 0 THEN 'SKIP'
    WHEN @role_permissions_fk_ref > 0 THEN 'KEEP'
    ELSE 'DROPPED'
  END,
  CASE
    WHEN @has_role_permissions = 0 THEN 'table not found'
    WHEN @role_permissions_fk_ref > 0 THEN CONCAT('blocked by FK references: ', @role_permissions_fk_ref)
    ELSE 'backup created: role_permissions_bak_20260317'
  END;

-- ===== modules =====
SET @has_modules := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'modules'
);

SET @modules_fk_ref := (
  SELECT COUNT(*) FROM information_schema.key_column_usage
  WHERE referenced_table_schema = @db_name
    AND referenced_table_name = 'modules'
    AND table_name NOT IN ('modules', 'role_permissions', 'employment_history')
);

SET @sql := IF(@has_modules = 1, 'CREATE TABLE IF NOT EXISTS modules_bak_20260317 LIKE modules', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_modules = 1, 'TRUNCATE TABLE modules_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_modules = 1, 'INSERT INTO modules_bak_20260317 SELECT * FROM modules', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_modules = 1 AND @modules_fk_ref = 0, 'DROP TABLE modules', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO cleanup_summary
SELECT
  'modules',
  CASE
    WHEN @has_modules = 0 THEN 'SKIP'
    WHEN @modules_fk_ref > 0 THEN 'KEEP'
    ELSE 'DROPPED'
  END,
  CASE
    WHEN @has_modules = 0 THEN 'table not found'
    WHEN @modules_fk_ref > 0 THEN CONCAT('blocked by FK references: ', @modules_fk_ref)
    ELSE 'backup created: modules_bak_20260317'
  END;

-- ===== employment_history =====
SET @has_employment_history := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'employment_history'
);

SET @employment_history_fk_ref := (
  SELECT COUNT(*) FROM information_schema.key_column_usage
  WHERE referenced_table_schema = @db_name
    AND referenced_table_name = 'employment_history'
);

SET @sql := IF(@has_employment_history = 1, 'CREATE TABLE IF NOT EXISTS employment_history_bak_20260317 LIKE employment_history', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_employment_history = 1, 'TRUNCATE TABLE employment_history_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_employment_history = 1, 'INSERT INTO employment_history_bak_20260317 SELECT * FROM employment_history', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_employment_history = 1 AND @employment_history_fk_ref = 0, 'DROP TABLE employment_history', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO cleanup_summary
SELECT
  'employment_history',
  CASE
    WHEN @has_employment_history = 0 THEN 'SKIP'
    WHEN @employment_history_fk_ref > 0 THEN 'KEEP'
    ELSE 'DROPPED'
  END,
  CASE
    WHEN @has_employment_history = 0 THEN 'table not found'
    WHEN @employment_history_fk_ref > 0 THEN CONCAT('blocked by FK references: ', @employment_history_fk_ref)
    ELSE 'backup created: employment_history_bak_20260317'
  END;

SELECT * FROM cleanup_summary ORDER BY table_name;
