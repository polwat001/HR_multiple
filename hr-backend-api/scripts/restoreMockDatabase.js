const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const sqlPath = path.join(__dirname, '..', 'sql', 'mock_backend_full.sql');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        current += ch;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (ch === '-' && next === '-') {
        inLineComment = true;
        i += 1;
        continue;
      }

      if (ch === '/' && next === '*') {
        inBlockComment = true;
        i += 1;
        continue;
      }
    }

    if (ch === "'" && !inDouble && !inBacktick) {
      const escaped = sql[i - 1] === '\\';
      if (!escaped) inSingle = !inSingle;
      current += ch;
      continue;
    }

    if (ch === '"' && !inSingle && !inBacktick) {
      const escaped = sql[i - 1] === '\\';
      if (!escaped) inDouble = !inDouble;
      current += ch;
      continue;
    }

    if (ch === '`' && !inSingle && !inDouble) {
      inBacktick = !inBacktick;
      current += ch;
      continue;
    }

    if (ch === ';' && !inSingle && !inDouble && !inBacktick) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function main() {
  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER;
  const dbPass = process.env.DB_PASS || '';
  const defaultDbName = process.env.DB_NAME;
  const targetDbName = process.argv[2] || defaultDbName;

  if (!dbHost || !dbUser || !targetDbName) {
    throw new Error('Missing DB config. Check DB_HOST, DB_USER, DB_NAME in .env');
  }

  const rawSql = fs.readFileSync(sqlPath, 'utf8');
  const statements = splitSqlStatements(rawSql).filter((stmt) => {
    const trimmed = stmt.trim();
    if (/^SET\s+FOREIGN_KEY_CHECKS\s*=\s*[01]/i.test(trimmed)) return false;
    if (/^CREATE\s+DATABASE\b/i.test(trimmed)) return false;
    if (/^USE\b/i.test(trimmed)) return false;
    return true;
  });

  const conn = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPass,
    multipleStatements: false,
  });

  try {
    console.log(`Restoring SQL into database: ${targetDbName}`);
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${targetDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${targetDbName}\``);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (let i = 0; i < statements.length; i += 1) {
      const stmt = statements[i];
      try {
        await conn.query(stmt);
      } catch (err) {
        const preview = stmt.slice(0, 180).replace(/\s+/g, ' ');
        throw new Error(
          `Failed at statement ${i + 1}/${statements.length}: ${err.code || err.message}\nSQL: ${preview}`
        );
      }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const [tableCountRows] = await conn.query(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?',
      [targetDbName]
    );
    console.log(`Restore completed. Tables: ${tableCountRows[0].total}`);
  } finally {
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {
      // Best effort: connection may already be closing after failure.
    }
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
