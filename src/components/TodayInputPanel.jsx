"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { INPUT_CLASSES, longDate, shortDate } from "@/lib/deck";

function groupClasses() {
  const groups = new Map();
  for (const item of INPUT_CLASSES) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item.name);
  }
  return [...groups.entries()];
}

const GROUPS = groupClasses();
const SAVE_DEBOUNCE_MS = 500;

const emptyDraft = () =>
  Object.fromEntries(INPUT_CLASSES.map(({ name }) => [name, { present: "", late: "" }]));

function draftFromValues(values) {
  const base = emptyDraft();
  for (const [name, entry] of Object.entries(values ?? {})) {
    if (!base[name]) continue;
    base[name] = {
      present: entry?.present != null ? String(entry.present) : "",
      late: entry?.late != null ? String(entry.late) : "",
    };
  }
  return base;
}

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

const SAVE_LABEL = {
  saving: "저장 중…",
  saved: "저장됨 · 모든 기기에 반영됩니다",
  error: "저장 실패 · 다시 시도해 주세요",
};

/**
 * 당일 출석 인원 임시 입력. 참석/지각만 입력하면 미지각(정시 출석)은 자동으로 계산해 보여준다.
 * 값은 서버(Turso)에 저장되므로 입력한 기기와 발표 화면을 보는 기기가 달라도 그대로 반영된다.
 */
export default function TodayInputPanel({
  targetDate,
  previousDate,
  lastWeekByClass = {},
  initialValues,
  onChange,
}) {
  const [draft, setDraft] = useState(() => draftFromValues(initialValues));
  const [saveState, setSaveState] = useState("idle");
  const saveTimer = useRef(null);
  const latestValues = useRef(null);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  const persist = (values) => {
    latestValues.current = values;
    setSaveState("saving");
    fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: targetDate, values }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("save failed");
        // 저장이 끝난 사이 더 최근 입력이 없을 때만 "저장됨"으로 표시한다.
        if (latestValues.current === values) setSaveState("saved");
      })
      .catch(() => {
        if (latestValues.current === values) setSaveState("error");
      });
  };

  const commit = (nextDraft) => {
    setDraft(nextDraft);
    const values = toValues(nextDraft);
    onChange?.(values);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(values), SAVE_DEBOUNCE_MS);
  };

  const handleChange = (name, field, raw) => {
    const cleaned = raw.replace(/[^\d]/g, "").slice(0, 4);
    commit({ ...draft, [name]: { ...draft[name], [field]: cleaned } });
  };

  const handleClear = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setDraft(emptyDraft());
    onChange?.({});
    setSaveState("saving");
    fetch(`/api/attendance?date=${targetDate}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("clear failed");
        setSaveState("idle");
      })
      .catch(() => setSaveState("error"));
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
        {saveState !== "idle" ? (
          <span className={`live-input__save live-input__save--${saveState}`}>
            {SAVE_LABEL[saveState]}
          </span>
        ) : null}
        <button type="button" className="deck-btn" onClick={handleClear}>
          전체 지우기
        </button>
      </div>
    </div>
  );
}
