"use client";

import { useMemo, useState } from "react";
import { INPUT_CLASSES, longDate, shortDate } from "@/lib/deck";
import { clearLiveInput, readLiveInput, writeLiveInput } from "@/lib/liveInput";

function groupClasses() {
  const groups = new Map();
  for (const item of INPUT_CLASSES) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item.name);
  }
  return [...groups.entries()];
}

const GROUPS = groupClasses();

function toValues(draft) {
  const out = {};
  for (const [name, raw] of Object.entries(draft)) {
    if (raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) out[name] = Math.round(n);
  }
  return out;
}

/**
 * 당일 출석 인원 임시 입력. 값은 DB에 저장하지 않고 이 기기의 localStorage에만 남는다.
 */
export default function TodayInputPanel({ targetDate, previousDate, lastWeekByClass = {}, onChange }) {
  const [draft, setDraft] = useState(() => {
    const stored = readLiveInput(targetDate);
    return Object.fromEntries(
      INPUT_CLASSES.map(({ name }) => [name, stored[name] != null ? String(stored[name]) : ""])
    );
  });

  const commit = (nextDraft) => {
    setDraft(nextDraft);
    const values = toValues(nextDraft);
    writeLiveInput(targetDate, values);
    onChange?.(values);
  };

  const handleChange = (name, raw) => {
    const cleaned = raw.replace(/[^\d]/g, "").slice(0, 4);
    commit({ ...draft, [name]: cleaned });
  };

  const handleClear = () => {
    clearLiveInput(targetDate);
    const empty = Object.fromEntries(INPUT_CLASSES.map(({ name }) => [name, ""]));
    setDraft(empty);
    onChange?.({});
  };

  const { total, filled } = useMemo(() => {
    const values = toValues(draft);
    return {
      total: Object.values(values).reduce((a, b) => a + b, 0),
      filled: Object.keys(values).length,
    };
  }, [draft]);

  return (
    <div className="live-input">
      <p className="live-input__intro">
        {longDate(targetDate)} 예배 출석 인원을 반별로 입력하세요.
      </p>
      <p className="live-input__note">
        입력하는 즉시 이 기기에 저장되고 발표 화면에 반영됩니다. 임시값이라 데이터베이스에는 저장되지
        않으며, 나중에 정식 데이터가 적재되면 자동으로 그 값으로 바뀝니다.
      </p>

      {GROUPS.map(([group, names]) => (
        <section className="live-input__group" key={group}>
          <h3 className="live-input__group-title">{group}</h3>
          {names.map((name) => {
            const prev = lastWeekByClass[name];
            return (
              <div className="live-input__row" key={name}>
                <label className="live-input__label" htmlFor={`live-${name}`}>
                  {name}
                </label>
                <span className="live-input__prev">
                  {previousDate ? `${shortDate(previousDate)} ${prev ?? 0}명` : ""}
                </span>
                <input
                  id={`live-${name}`}
                  className="live-input__field"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label={`${name} 출석 인원`}
                  value={draft[name] ?? ""}
                  onChange={(e) => handleChange(name, e.target.value)}
                />
              </div>
            );
          })}
        </section>
      ))}

      <div className="live-input__foot">
        <span className="live-input__total">
          입력 완료 <b>{filled}</b> / {INPUT_CLASSES.length}개 반 · 합계 <b>{total}</b>명
        </span>
        <button type="button" className="deck-btn" onClick={handleClear}>
          전체 지우기
        </button>
      </div>
    </div>
  );
}
