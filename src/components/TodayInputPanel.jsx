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

const emptyDraft = () =>
  Object.fromEntries(INPUT_CLASSES.map(({ name }) => [name, { present: "", late: "" }]));

function toValues(draft) {
  const out = {};
  for (const [name, fields] of Object.entries(draft)) {
    const entry = {};
    if (fields.present !== "") {
      const n = Number(fields.present);
      if (Number.isFinite(n) && n >= 0) entry.present = Math.round(n);
    }
    if (fields.late !== "") {
      const n = Number(fields.late);
      if (Number.isFinite(n) && n >= 0) entry.late = Math.round(n);
    }
    if (Object.keys(entry).length > 0) out[name] = entry;
  }
  return out;
}

/**
 * 당일 출석 인원 임시 입력. 값은 DB에 저장하지 않고 이 기기의 localStorage에만 남는다.
 * 참석/지각만 받고, 지각을 뺀 정시 출석(미지각)은 그 자리에서 계산해 보여준다.
 */
export default function TodayInputPanel({ targetDate, previousDate, lastWeekByClass = {}, onChange }) {
  const [draft, setDraft] = useState(() => {
    const stored = readLiveInput(targetDate);
    const base = emptyDraft();
    for (const [name, entry] of Object.entries(stored)) {
      base[name] = {
        present: entry.present != null ? String(entry.present) : "",
        late: entry.late != null ? String(entry.late) : "",
      };
    }
    return base;
  });

  const commit = (nextDraft) => {
    setDraft(nextDraft);
    const values = toValues(nextDraft);
    writeLiveInput(targetDate, values);
    onChange?.(values);
  };

  const handleChange = (name, field, raw) => {
    const cleaned = raw.replace(/[^\d]/g, "").slice(0, 4);
    commit({ ...draft, [name]: { ...draft[name], [field]: cleaned } });
  };

  const handleClear = () => {
    clearLiveInput(targetDate);
    setDraft(emptyDraft());
    onChange?.({});
  };

  const { total, filled } = useMemo(() => {
    const values = toValues(draft);
    return {
      total: Object.values(values).reduce((a, b) => a + (b.present ?? 0), 0),
      filled: Object.values(values).filter((v) => typeof v.present === "number").length,
    };
  }, [draft]);

  return (
    <div className="live-input">
      <p className="live-input__intro">
        {longDate(targetDate)} 예배 출석 인원을 반별로 입력하세요.
      </p>

      {GROUPS.map(([group, names]) => (
        <section className="live-input__group" key={group}>
          <h3 className="live-input__group-title">{group}</h3>
          {names.map((name) => {
            const prev = lastWeekByClass[name];
            const fields = draft[name];
            const presentNum = fields.present === "" ? null : Number(fields.present);
            const lateNum = fields.late === "" ? 0 : Number(fields.late);
            const onTime =
              presentNum !== null && Number.isFinite(presentNum) && Number.isFinite(lateNum)
                ? Math.max(0, presentNum - lateNum)
                : null;
            return (
              <div className="live-input__row" key={name}>
                <label className="live-input__label" htmlFor={`live-${name}-present`}>
                  {name}
                </label>
                <span className="live-input__prev">
                  {previousDate ? `${shortDate(previousDate)} ${prev ?? 0}명` : ""}
                </span>
                <div className="live-input__fields">
                  <span className="live-input__field-group">
                    <span className="live-input__field-label">참석</span>
                    <input
                      id={`live-${name}-present`}
                      className="live-input__field"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`${name} 참석 인원`}
                      value={fields.present}
                      onChange={(e) => handleChange(name, "present", e.target.value)}
                    />
                  </span>
                  <span className="live-input__field-group">
                    <span className="live-input__field-label">지각</span>
                    <input
                      id={`live-${name}-late`}
                      className="live-input__field"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`${name} 지각 인원`}
                      value={fields.late}
                      onChange={(e) => handleChange(name, "late", e.target.value)}
                    />
                  </span>
                  <span className="live-input__derived">미지각 {onTime ?? "—"}</span>
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <div className="live-input__foot">
        <span className="live-input__total">
          입력 완료 <b>{filled}</b> / {INPUT_CLASSES.length}개 반 · 참석 합계 <b>{total}</b>명
        </span>
        <button type="button" className="deck-btn" onClick={handleClear}>
          전체 지우기
        </button>
      </div>
    </div>
  );
}
