// 서버 전용: Turso `Att_School`에서 반별 주간 출석 인원을 읽어 카드 시리즈로 만든다.
import { getDb } from "@/lib/turso";
import { CARDS, WEEKS, sundaysEndingAt } from "@/lib/deck";

// '가정'(가정예배)은 참석으로 집계한다.
const PRESENT_VALUES = ["참석", "가정"];
// '장기섬김'은 실제 예배 반이 아니므로 전 카드에서 제외한다.
const EXCLUDED_GRADE = "장기섬김";

function placeholders(n) {
  return Array.from({ length: n }, () => "?").join(",");
}

/**
 * @param {string} targetDate 기준 일요일 (YYYY-MM-DD)
 * @returns {Promise<{targetDate: string, dates: string[], todayInDb: boolean, cards: object[]}>}
 */
export async function getAttendanceSeries(targetDate) {
  const dates = sundaysEndingAt(targetDate, WEEKS);
  const db = getDb();

  const [counts, loaded] = await Promise.all([
    db.execute({
      sql: `SELECT Att_Date, Div_Class, COUNT(*) AS present
              FROM Att_School
             WHERE Att_Date IN (${placeholders(dates.length)})
               AND Div_Grade <> ?
               AND Att_School IN (${placeholders(PRESENT_VALUES.length)})
             GROUP BY Att_Date, Div_Class`,
      args: [...dates, EXCLUDED_GRADE, ...PRESENT_VALUES],
    }),
    // 그 주 데이터가 적재되었는지 자체를 확인한다 (출석 0명인 주와 미적재 주를 구분하기 위해).
    db.execute({
      sql: `SELECT DISTINCT Att_Date FROM Att_School
             WHERE Att_Date IN (${placeholders(dates.length)})`,
      args: dates,
    }),
  ]);

  // date -> class -> present
  const byDate = new Map(dates.map((d) => [d, new Map()]));
  for (const row of counts.rows) {
    byDate.get(row.Att_Date)?.set(row.Div_Class, Number(row.present));
  }
  const loadedDates = new Set(loaded.rows.map((r) => r.Att_Date));

  // 당일 입력 화면에서 "지난주 N명"을 보여주기 위한 반 단위 직전 주 값.
  const previousDate = dates[dates.length - 2];
  const lastWeekByClass = Object.fromEntries(byDate.get(previousDate) ?? []);

  const cards = CARDS.map((card) => ({
    key: card.key,
    title: card.title,
    subtitle: card.subtitle,
    classes: card.classes,
    points: dates.map((date) => {
      if (!loadedDates.has(date)) return { date, present: null, source: null };
      const perClass = byDate.get(date);
      const present = card.classes.reduce((sum, name) => sum + (perClass.get(name) ?? 0), 0);
      return { date, present, source: "db" };
    }),
  }));

  return {
    targetDate,
    dates,
    previousDate,
    todayInDb: loadedDates.has(targetDate),
    lastWeekByClass,
    cards,
  };
}
