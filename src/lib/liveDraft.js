// 서버 전용: 당일 임시 입력(참석/지각)을 Turso에 저장한다.
// 기기의 localStorage가 아니라 DB에 두어야, 입력하는 사람과 발표 화면을 보는 기기가
// 달라도(다른 브라우저·다른 사람) 같은 값을 본다.
import { INPUT_CLASSES } from "@/lib/deck";

const VALID_CLASSES = new Set(INPUT_CLASSES.map((c) => c.name));

let ensured = false;
async function ensureTable(db) {
  if (ensured) return;
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Att_Live_Draft (
      Att_Date TEXT NOT NULL,
      Div_Class TEXT NOT NULL,
      Present INTEGER,
      Late INTEGER,
      Updated_At TEXT NOT NULL,
      PRIMARY KEY (Att_Date, Div_Class)
    )
  `);
  ensured = true;
}

/** @returns {Promise<Record<string, {present?: number, late?: number}>>} */
export async function readLiveDraft(db, date) {
  await ensureTable(db);
  const result = await db.execute({
    sql: `SELECT Div_Class, Present, Late FROM Att_Live_Draft WHERE Att_Date = ?`,
    args: [date],
  });
  const out = {};
  for (const row of result.rows) {
    const entry = {};
    if (row.Present !== null) entry.present = Number(row.Present);
    if (row.Late !== null) entry.late = Number(row.Late);
    if (Object.keys(entry).length > 0) out[row.Div_Class] = entry;
  }
  return out;
}

/**
 * @param {string} date
 * @param {Record<string, {present?: number, late?: number}>} values
 */
export async function writeLiveDraft(db, date, values) {
  await ensureTable(db);
  const now = new Date().toISOString();
  const entries = Object.entries(values).filter(([name]) => VALID_CLASSES.has(name));

  await db.batch(
    [
      // 지난 주 이전 임시값은 더 볼 일이 없으니 새로 쓸 때 같이 정리한다.
      { sql: `DELETE FROM Att_Live_Draft WHERE Att_Date <> ?`, args: [date] },
      ...entries.map(([name, entry]) => ({
        sql: `INSERT INTO Att_Live_Draft (Att_Date, Div_Class, Present, Late, Updated_At)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(Att_Date, Div_Class) DO UPDATE SET
                Present = excluded.Present,
                Late = excluded.Late,
                Updated_At = excluded.Updated_At`,
        args: [
          date,
          name,
          typeof entry.present === "number" ? entry.present : null,
          typeof entry.late === "number" ? entry.late : null,
          now,
        ],
      })),
    ],
    "write"
  );
}

/** "전체 지우기": 그 주 임시값을 통째로 지운다. */
export async function clearLiveDraft(db, date) {
  await ensureTable(db);
  await db.execute({ sql: `DELETE FROM Att_Live_Draft WHERE Att_Date = ?`, args: [date] });
}
