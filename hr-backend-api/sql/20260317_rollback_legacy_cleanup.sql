-- Rollback script for legacy cleanup
-- Restores data from backup tables created by:
--   20260317_cleanup_legacy_tables_with_backup.sql
--
-- Restored tables:
-- - modules
-- - role_permissions
-- - employment_history

SET @db_name := DATABASE();

DROP TEMPORARY TABLE IF EXISTS rollback_summary;
CREATE TEMPORARY TABLE rollback_summary (
  table_name VARCHAR(120) NOT NULL,
  action VARCHAR(120) NOT NULL,
  details VARCHAR(1000) NOT NULL
);

-- ===== modules =====
SET @has_modules_bak := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'modules_bak_20260317'
);

SET @sql := IF(@has_modules_bak = 1, 'DROP TABLE IF EXISTS modules', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_modules_bak = 1, 'CREATE TABLE modules LIKE modules_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_modules_bak = 1, 'INSERT INTO modules SELECT * FROM modules_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO rollback_summary
SELECT
  'modules',
  CASE WHEN @has_modules_bak = 1 THEN 'RESTORED' ELSE 'SKIP' END,
  CASE WHEN @has_modules_bak = 1 THEN 'restored from modules_bak_20260317' ELSE 'backup not found' END;

-- ===== role_permissions =====
SET @has_role_permissions_bak := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'role_permissions_bak_20260317'
);

SET @sql := IF(@has_role_permissions_bak = 1, 'DROP TABLE IF EXISTS role_permissions', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_role_permissions_bak = 1, 'CREATE TABLE role_permissions LIKE role_permissions_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_role_permissions_bak = 1, 'INSERT INTO role_permissions SELECT * FROM role_permissions_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO rollback_summary
SELECT
  'role_permissions',
  CASE WHEN @has_role_permissions_bak = 1 THEN 'RESTORED' ELSE 'SKIP' END,
  CASE WHEN @has_role_permissions_bak = 1 THEN 'restored from role_permissions_bak_20260317' ELSE 'backup not found' END;

-- ===== employment_history =====
SET @has_employment_history_bak := (
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'employment_history_bak_20260317'
);

SET @sql := IF(@has_employment_history_bak = 1, 'DROP TABLE IF EXISTS employment_history', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_employment_history_bak = 1, 'CREATE TABLE employment_history LIKE employment_history_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(@has_employment_history_bak = 1, 'INSERT INTO employment_history SELECT * FROM employment_history_bak_20260317', 'SELECT ''skip''');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO rollback_summary
SELECT
  'employment_history',
  CASE WHEN @has_employment_history_bak = 1 THEN 'RESTORED' ELSE 'SKIP' END,
  CASE WHEN @has_employment_history_bak = 1 THEN 'restored from employment_history_bak_20260317' ELSE 'backup not found' END;

SELECT * FROM rollback_summary ORDER BY table_name;
