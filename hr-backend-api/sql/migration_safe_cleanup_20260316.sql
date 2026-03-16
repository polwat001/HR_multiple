-- Safe cleanup migration for currently unused tables
-- Scope: tables that are not referenced by backend runtime code
-- Date: 2026-03-16

-- Recommended run order:
-- 1) Run backup script first
-- 2) Verify row counts in backup tables
-- 3) Run this script

SET @suffix = '20260316';

-- 1) Backup tables before cleanup
CREATE TABLE IF NOT EXISTS contract_templates_bak_20260316 AS SELECT * FROM contract_templates;
CREATE TABLE IF NOT EXISTS employment_history_bak_20260316 AS SELECT * FROM employment_history;
CREATE TABLE IF NOT EXISTS modules_bak_20260316 AS SELECT * FROM modules;
CREATE TABLE IF NOT EXISTS role_permissions_bak_20260316 AS SELECT * FROM role_permissions;

-- 2) Drop unused tables (safe set)
DROP TABLE IF EXISTS contract_templates;
DROP TABLE IF EXISTS employment_history;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS role_permissions;

-- 3) Post-check
SELECT 'contract_templates_bak_20260316' AS backup_table, COUNT(*) AS rows_count FROM contract_templates_bak_20260316
UNION ALL
SELECT 'employment_history_bak_20260316', COUNT(*) FROM employment_history_bak_20260316
UNION ALL
SELECT 'modules_bak_20260316', COUNT(*) FROM modules_bak_20260316
UNION ALL
SELECT 'role_permissions_bak_20260316', COUNT(*) FROM role_permissions_bak_20260316;
