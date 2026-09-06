"use client";

// 당일 출석 인원은 임시값이라 DB에 저장하지 않는다.
// 발표하는 기기의 localStorage에만 그 주 날짜를 키로 보관한다.

const PREFIX = "att-live:";

export function liveKey(targetDate) {
  return `${PREFIX}${targetDate}`;
}

/** @returns {Record<string, {present?: number, late?: number}>} 반 이름 -> 참석/지각 인원 */
export function readLiveInput(targetDate) {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(liveKey(targetDate));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [name, value] of Object.entries(parsed)) {
      // 예전 형식(반별 숫자 하나)도 그대로 읽혀야 그 주에 이미 입력한 값이 사라지지 않는다.
      const legacy = typeof value === "number" || typeof value === "string";
      const source = legacy ? { present: value } : value;
      if (!source || typeof source !== "object") continue;
      const entry = {};
      const present = Number(source.present);
      const late = Number(source.late);
      if (Number.isFinite(present) && present >= 0) entry.present = Math.round(present);
      if (Number.isFinite(late) && late >= 0) entry.late = Math.round(late);
      if (Object.keys(entry).length > 0) out[name] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

export function writeLiveInput(targetDate, values) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(liveKey(targetDate), JSON.stringify(values));
  } catch {
    // 저장 실패(사생활 보호 모드 등)해도 화면은 그대로 동작한다.
  }
}

export function clearLiveInput(targetDate) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(liveKey(targetDate));
  } catch {
    // no-op
  }
}

/** 지난 주 대비 오래된 임시 입력을 정리한다. */
export function pruneOldLiveInput(targetDate) {
  if (typeof window === "undefined") return;
  try {
    const keep = liveKey(targetDate);
    const stale = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PREFIX) && key !== keep) stale.push(key);
    }
    stale.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // no-op
  }
}
