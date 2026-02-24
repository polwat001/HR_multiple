const db = require('../config/db');

let _scheduleTablePromise;
let _scheduleColumnsPromise;

async function resolveScheduleTable() {
  if (_scheduleTablePromise) return _scheduleTablePromise;

  _scheduleTablePromise = (async () => {
    const candidates = ['schedules', 'schedule', 'work_schedules', 'employee_schedules', 'shift_schedules'];

    for (const name of candidates) {
      const [rows] = await db.query(
        `SELECT 1
         FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?
         LIMIT 1`,
        [name]
      );
      if (rows.length > 0) return name;
    }

    const [likeRows] = await db.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name LIKE '%schedule%'
       ORDER BY table_name ASC
       LIMIT 1`
    );

    if (likeRows.length > 0) return likeRows[0].table_name;

    throw new Error("ไม่พบตาราง schedule (ลองสร้างตารางชื่อ 'schedules' หรือแก้ candidates ใน scheduleController)");
  })();

  return _scheduleTablePromise;
}

async function resolveScheduleColumns(tableName) {
  if (_scheduleColumnsPromise) return _scheduleColumnsPromise;

  _scheduleColumnsPromise = (async () => {
    const [rows] = await db.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [tableName]
    );

    return rows.map((r) => r.column_name);
  })();

  return _scheduleColumnsPromise;
}

function pickInsertableColumns(allColumns, payload) {
  const disallowed = new Set(['id', 'created_at', 'updated_at']);
  const payloadKeys = Object.keys(payload || {});
  return payloadKeys.filter((k) => allColumns.includes(k) && !disallowed.has(k));
}

// ==========================================
// 1) ดึงตารางงานทั้งหมด (GET)
// ==========================================
exports.getAllSchedules = async (req, res) => {
  try {
    const tableName = await resolveScheduleTable();
    const columns = await resolveScheduleColumns(tableName);

    const hasId = columns.includes('id');
    const sql = hasId ? `SELECT * FROM \`${tableName}\` ORDER BY id DESC` : `SELECT * FROM \`${tableName}\``;

    const [rows] = await db.query(sql);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'ดึงตารางงานไม่สำเร็จ', error: err.message });
  }
};

// ==========================================
// 2) จัดตารางงานใหม่ (POST)
// ==========================================
exports.createSchedule = async (req, res) => {
  try {
    const tableName = await resolveScheduleTable();
    const columns = await resolveScheduleColumns(tableName);

    const insertCols = pickInsertableColumns(columns, req.body);

    if (insertCols.length === 0) {
      return res.status(400).json({
        message:
          'ไม่พบฟิลด์ที่ insert ได้จาก payload (ตรวจชื่อคอลัมน์ให้ตรงกับตาราง schedule ใน DB)',
        availableColumns: columns
      });
    }

    const values = insertCols.map((c) => (req.body[c] === undefined ? null : req.body[c]));

    const colIdents = insertCols.map(() => '??').join(', ');
    const valPlaceholders = insertCols.map(() => '?').join(', ');

    const sql = `INSERT INTO ?? (${colIdents}) VALUES (${valPlaceholders})`;
    const params = [tableName, ...insertCols, ...values];

    const [result] = await db.query(sql, params);

    res.status(201).json({
      message: 'สร้างตารางงานสำเร็จ!',
      scheduleId: result.insertId ?? null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'บันทึกตารางงานไม่สำเร็จ', error: err.message });
  }
};