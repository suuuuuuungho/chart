// 발표 덱의 순수 설정 + 날짜 계산.
// 서버/클라이언트 양쪽에서 쓰이므로 DB 의존성을 두지 않는다.

export const WEEKS = 8;

const GRADE_1 = ["1-1반", "1-2반", "1-3반", "1-4반", "1-5반", "1-6반"];
const GRADE_2 = ["2-1반", "2-2반", "2-3반", "2-4반", "2-5반", "2-6반", "2-7반"];
const GRADE_3 = ["3-1반", "3-2반", "3-3반", "3-4반", "3-5반"];
const NEWCOMER = ["신입1반", "신입2반", "신입3반", "신입4반"];

// 당일 임시 입력을 받는 단위 = 실제 반 22개.
export const INPUT_CLASSES = [
  ...GRADE_1.map((name) => ({ name, group: "중등부 1학년" })),
  ...GRADE_2.map((name) => ({ name, group: "중등부 2학년" })),
  ...GRADE_3.map((name) => ({ name, group: "중등부 3학년" })),
  ...NEWCOMER.map((name) => ({ name, group: "중등부 신입부" })),
];

const ALL_CLASSES = [...GRADE_1, ...GRADE_2, ...GRADE_3, ...NEWCOMER];

// 넘겨가며 볼 카드 20장: 1~3학년은 반별, 신입부 1장, 전체 요약 1장.
export const CARDS = [
  ...GRADE_1.map((name) => ({ key: name, title: name, subtitle: "중등부 1학년", classes: [name] })),
  ...GRADE_2.map((name) => ({ key: name, title: name, subtitle: "중등부 2학년", classes: [name] })),
  ...GRADE_3.map((name) => ({ key: name, title: name, subtitle: "중등부 3학년", classes: [name] })),
  { key: "신입부", title: "신입부", subtitle: "신입1~4반 합계", classes: NEWCOMER },
  { key: "전체", title: "전체", subtitle: "중등부 전체 합계", classes: ALL_CLASSES },
];

// 그래프 색. 반/신입부는 원래 쓰던 보라색으로 통일하고, 전체(레드)·지각(핑크)만 구분한다.
const CLASS_COLOR = "#b19eef";
const TOTAL_COLOR = "#ad2f26";
export const LATE_COLOR = "#cc66aa";

export const CARD_COLORS = Object.fromEntries(
  CARDS.map((card) => [card.key, card.key === "전체" ? TOTAL_COLOR : CLASS_COLOR])
);

// 카드 바로가기 칩에 쓰는 짧은 라벨 ("1-1반" -> "1-1").
export function shortLabel(key) {
  if (key === "신입부" || key === "전체") return key;
  return key.replace("반", "");
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isISODate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** 기준 일요일: 오늘이 일요일이면 오늘, 아니면 다가오는 일요일. */
export function resolveTargetSunday(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = d.getDay();
  if (dow !== 0) d.setDate(d.getDate() + (7 - dow));
  return toISODate(d);
}

/** 기준 일요일로 끝나는 최근 `count`개 일요일 (오름차순). */
export function sundaysEndingAt(iso, count = WEEKS) {
  const end = parseISODate(iso);
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const t = new Date(end);
    t.setDate(end.getDate() - i * 7);
    out.push(toISODate(t));
  }
  return out;
}

/**
 * 값이 좁은 범위에 몰려도 추이가 보이도록 위아래로 여유를 준 눈금.
 * 반 20개를 한 스케일로 묶다 보니 여백까지 넉넉하면 개별 반의 증감이 다 눌려 보였다.
 * 라벨 한 줄 들어갈 만큼만 남기고 나머지는 실제 데이터가 채우게 한다.
 */
export function makeScale(values) {
  const known = values.filter((v) => v !== null && v !== undefined);
  if (known.length === 0) return { min: 0, max: 1 };
  const lo = Math.min(...known);
  const hi = Math.max(...known);
  if (hi === lo) return { min: Math.max(0, lo - 2), max: lo + 2 };
  const span = hi - lo;
  return { min: Math.max(0, lo - span * 0.08), max: hi + span * 0.18 };
}

/** "2026-08-30" -> "8/30" */
export function shortDate(iso) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026-09-06" -> "2026년 9월 6일 일" */
export function longDate(iso) {
  const [y, m, d] = iso.split("-");
  const day = WEEKDAYS[parseISODate(iso).getDay()];
  return `${y}년 ${Number(m)}월 ${Number(d)}일 ${day}`;
}
