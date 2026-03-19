const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mysql = require('mysql2/promise');
require('dotenv').config();

const backendRoot = path.join(__dirname, '..');
const envPath = path.join(backendRoot, '.env');

function parseArgs(argv) {
  const out = {
    dbName: process.env.DB_NAME || 'datarollhr_rebuild',
    switchEnv: true,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--db' && argv[i + 1]) {
      out.dbName = String(argv[i + 1]).trim();
      i += 1;
      continue;
    }
    if (arg === '--no-switch-env') {
      out.switchEnv = false;
      continue;
    }

    if (!arg.startsWith('--')) {
      positional.push(String(arg).trim());
    }
  }

  if (positional.length > 0) {
    out.dbName = positional[positional.length - 1];
  }

  return out;
}

function runNodeScript(scriptRelativePath, args = [], extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptRelativePath, ...args], {
      cwd: backendRoot,
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv },
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      return reject(new Error(`Command failed: node ${scriptRelativePath} ${args.join(' ')} (exit ${code})`));
    });
  });
}

async function ensureApprovalFlowPolicies(dbName) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS || '',
    database: dbName,
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS approval_flow_policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module_key VARCHAR(50) NOT NULL,
        escalation_days INT NOT NULL DEFAULT 0,
        delegate_role VARCHAR(100) NOT NULL DEFAULT '',
        updated_by INT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_policy_module_key (module_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(
      `INSERT INTO approval_flow_policies (module_key, escalation_days, delegate_role, updated_by)
       VALUES ('leave', 0, '', 1), ('ot', 0, '', 1), ('payroll', 0, '', 1)
       ON DUPLICATE KEY UPDATE
         escalation_days = VALUES(escalation_days),
         delegate_role = VALUES(delegate_role),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP`
    );
  } finally {
    await conn.end();
  }
}

async function verifyDatabase(dbName) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS || '',
    database: dbName,
  });

  const requiredTables = [
    'companies',
    'departments',
    'employees',
    'users',
    'roles',
    'leave_types',
    'leave_balances',
    'leave_requests',
    'ot_requests',
    'approval_flow_configs',
    'approval_flow_policies',
    'role_permission_matrix',
    'audit_logs',
  ];

  try {
    const [tableRows] = await conn.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ?`,
      [dbName]
    );

    const existing = new Set(tableRows.map((row) => String(row.table_name)));
    const missing = requiredTables.filter((name) => !existing.has(name));
    if (missing.length > 0) {
      throw new Error(`Missing required tables: ${missing.join(', ')}`);
    }

    const countRows = [];
    for (const tableName of requiredTables) {
      const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM ${tableName}`);
      countRows.push({ table: tableName, count: Number(rows[0].c || 0) });
    }

    console.log('Verification counts');
    console.table(countRows);
  } finally {
    await conn.end();
  }
}

function switchEnvDatabase(dbName) {
  if (!fs.existsSync(envPath)) {
    throw new Error('.env file not found');
  }

  const envText = fs.readFileSync(envPath, 'utf8');
  const hasDbName = /^DB_NAME=/m.test(envText);
  const next = hasDbName
    ? envText.replace(/^DB_NAME=.*$/m, `DB_NAME=${dbName}`)
    : `${envText.trim()}\nDB_NAME=${dbName}\n`;

  fs.writeFileSync(envPath, next, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!options.dbName) {
    throw new Error('DB name is required. Use --db <name>');
  }

  console.log(`One-click recovery started. Target DB: ${options.dbName}`);
  await runNodeScript(path.join('scripts', 'restoreMockDatabase.js'), [options.dbName]);
  await runNodeScript(path.join('scripts', 'seedMockData.js'), [], { DB_NAME: options.dbName });
  await ensureApprovalFlowPolicies(options.dbName);
  await verifyDatabase(options.dbName);

  if (options.switchEnv) {
    switchEnvDatabase(options.dbName);
    console.log(`Updated .env DB_NAME to ${options.dbName}`);
  } else {
    console.log('Skipped .env DB_NAME update by flag --no-switch-env');
  }

  console.log('One-click recovery finished successfully.');
}

main().catch((error) => {
  console.error('One-click recovery failed:', error.message);
  process.exit(1);
});
