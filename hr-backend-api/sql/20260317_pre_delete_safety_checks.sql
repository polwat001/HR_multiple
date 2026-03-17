-- Pre-delete safety checks (automated)
-- Purpose:
-- 1) Validate readiness before merging holidays -> public_holidays
-- 2) Validate readiness before dropping legacy tables
--
-- Output:
-- - Detailed check rows with severity: INFO, WARN, BLOCKER
-- - Final GO / NO-GO decision

SET @db_name := DATABASE();

DROP TEMPORARY TABLE IF EXISTS safety_check_results;
CREATE TEMPORARY TABLE safety_check_results (
  check_name VARCHAR(120) NOT NULL,
  severity ENUM('INFO','WARN','BLOCKER') NOT NULL,
  details VARCHAR(1000) NOT NULL
);

-- Table existence checks
INSERT INTO safety_check_results
SELECT 'table.public_holidays.exists', 'INFO', 'public_holidays table exists'
FROM dual
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'public_holidays'
);

INSERT INTO safety_check_results
SELECT 'table.public_holidays.exists', 'BLOCKER', 'public_holidays table is missing'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'public_holidays'
);

INSERT INTO safety_check_results
SELECT 'table.holidays.exists', 'INFO', 'holidays table exists (fallback table present)'
FROM dual
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'holidays'
);

INSERT INTO safety_check_results
SELECT 'table.holidays.exists', 'WARN', 'holidays table is missing (nothing to merge)'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'holidays'
);

-- Required columns in public_holidays
INSERT INTO safety_check_results
SELECT 'public_holidays.column.holiday_date', 'BLOCKER', 'missing column public_holidays.holiday_date'
FROM dual
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'public_holidays'
)
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = @db_name AND table_name = 'public_holidays' AND column_name = 'holiday_date'
);

INSERT INTO safety_check_results
SELECT 'public_holidays.column.name', 'BLOCKER', 'missing column public_holidays.name'
FROM dual
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'public_holidays'
)
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = @db_name AND table_name = 'public_holidays' AND column_name = 'name'
);

INSERT INTO safety_check_results
SELECT 'public_holidays.column.company_id', 'BLOCKER', 'missing column public_holidays.company_id'
FROM dual
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'public_holidays'
)
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = @db_name AND table_name = 'public_holidays' AND column_name = 'company_id'
);

-- Required columns in holidays (source)
INSERT INTO safety_check_results
SELECT 'holidays.column.date', 'WARN', 'missing column holidays.date (merge script may not move rows)'
FROM dual
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'holidays'
)
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = @db_name AND table_name = 'holidays' AND column_name = 'date'
);

INSERT INTO safety_check_results
SELECT 'holidays.column.name', 'WARN', 'missing column holidays.name (merge script may not move rows)'
FROM dual
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'holidays'
)
AND NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = @db_name AND table_name = 'holidays' AND column_name = 'name'
);

-- Row counts and overlap estimate
INSERT INTO safety_check_results
SELECT 'rows.public_holidays', 'INFO', CONCAT('rows=', COUNT(*))
FROM public_holidays
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'public_holidays'
);

INSERT INTO safety_check_results
SELECT 'rows.holidays', 'INFO', CONCAT('rows=', COUNT(*))
FROM holidays
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'holidays'
);

INSERT INTO safety_check_results
SELECT
  'merge.overlap',
  'INFO',
  CONCAT('existing_overlap=', COUNT(*))
FROM holidays h
JOIN public_holidays p
  ON p.holiday_date = h.date
 AND IFNULL(p.company_id, -1) = IFNULL(h.company_id, -1)
 AND p.name COLLATE utf8mb4_unicode_ci = h.name COLLATE utf8mb4_unicode_ci
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'holidays'
)
AND EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'public_holidays'
);

INSERT INTO safety_check_results
SELECT
  'merge.to_insert',
  'INFO',
  CONCAT('to_insert=', COUNT(*))
FROM holidays h
LEFT JOIN public_holidays p
  ON p.holiday_date = h.date
 AND IFNULL(p.company_id, -1) = IFNULL(h.company_id, -1)
 AND p.name COLLATE utf8mb4_unicode_ci = h.name COLLATE utf8mb4_unicode_ci
WHERE p.id IS NULL
  AND h.date IS NOT NULL
  AND COALESCE(h.name, '') <> ''
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = @db_name AND table_name = 'holidays'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = @db_name AND table_name = 'public_holidays'
  );

-- Legacy tables status
INSERT INTO safety_check_results
SELECT 'legacy.modules', 'INFO', CONCAT('rows=', COUNT(*))
FROM modules
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'modules'
);

INSERT INTO safety_check_results
SELECT 'legacy.modules', 'INFO', 'table not found (already cleaned)'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'modules'
);

INSERT INTO safety_check_results
SELECT 'legacy.role_permissions', 'INFO', CONCAT('rows=', COUNT(*))
FROM role_permissions
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'role_permissions'
);

INSERT INTO safety_check_results
SELECT 'legacy.role_permissions', 'INFO', 'table not found (already cleaned)'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'role_permissions'
);

INSERT INTO safety_check_results
SELECT 'legacy.employment_history', 'INFO', CONCAT('rows=', COUNT(*))
FROM employment_history
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'employment_history'
);

INSERT INTO safety_check_results
SELECT 'legacy.employment_history', 'INFO', 'table not found (already cleaned)'
FROM dual
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = @db_name AND table_name = 'employment_history'
);

-- Foreign key blockers for legacy drop
INSERT INTO safety_check_results
SELECT
  'legacy.fk_references',
  'BLOCKER',
  CONCAT('legacy table referenced by FK: ', kcu.referenced_table_name, ' <- ', kcu.table_name, '.', kcu.column_name)
FROM information_schema.key_column_usage kcu
WHERE kcu.referenced_table_schema = @db_name
  AND kcu.referenced_table_name IN ('modules', 'role_permissions', 'employment_history')
  AND kcu.table_name NOT IN ('modules', 'role_permissions', 'employment_history');

-- View/routine/trigger references (warn only)
INSERT INTO safety_check_results
SELECT
  'legacy.view_reference',
  'WARN',
  CONCAT('view references legacy table: ', table_name)
FROM information_schema.views v
WHERE v.table_schema = @db_name
  AND (
    UPPER(v.view_definition) LIKE '% MODULES %'
    OR UPPER(v.view_definition) LIKE '% ROLE_PERMISSIONS %'
    OR UPPER(v.view_definition) LIKE '% EMPLOYMENT_HISTORY %'
  );

INSERT INTO safety_check_results
SELECT
  'legacy.routine_reference',
  'WARN',
  CONCAT('routine references legacy table: ', routine_name)
FROM information_schema.routines r
WHERE r.routine_schema = @db_name
  AND (
    UPPER(r.routine_definition) LIKE '% MODULES %'
    OR UPPER(r.routine_definition) LIKE '% ROLE_PERMISSIONS %'
    OR UPPER(r.routine_definition) LIKE '% EMPLOYMENT_HISTORY %'
  );

INSERT INTO safety_check_results
SELECT
  'legacy.trigger_reference',
  'WARN',
  CONCAT('trigger references legacy table: ', trigger_name)
FROM information_schema.triggers t
WHERE t.trigger_schema = @db_name
  AND (
    UPPER(t.action_statement) LIKE '% MODULES %'
    OR UPPER(t.action_statement) LIKE '% ROLE_PERMISSIONS %'
    OR UPPER(t.action_statement) LIKE '% EMPLOYMENT_HISTORY %'
  );

-- Final report
SELECT *
FROM safety_check_results
ORDER BY FIELD(severity, 'BLOCKER', 'WARN', 'INFO'), check_name;

SELECT
  SUM(severity = 'BLOCKER') AS blockers,
  SUM(severity = 'WARN') AS warnings,
  SUM(severity = 'INFO') AS infos
FROM safety_check_results;

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM safety_check_results WHERE severity = 'BLOCKER') THEN 'NO-GO'
    ELSE 'GO'
  END AS readiness;
