"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TodayInputPanel from "@/components/TodayInputPanel";
import { isISODate, resolveTargetSunday } from "@/lib/deck";
import "@/components/deck.css";

/** 태블릿/폰에서 당일 인원만 입력하는 전용 화면. */
export default function InputScreen() {
  const [targetDate, setTargetDate] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    const override = new URLSearchParams(window.location.search).get("date");
    const resolved = isISODate(override) ? override : resolveTargetSunday();

    let cancelled = false;
    // 지난주 값은 있으면 좋은 참고치라, 못 받아와도 입력은 그대로 가능하게 둔다.
    fetch(`/api/attendance?date=${resolved}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((json) => {
        if (cancelled) return;
        setTargetDate(resolved);
        if (json) setMeta(json);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="deck-root">
      <header className="deck-panel__head">
        <h1 className="deck-panel__title">당일 출석 인원 입력</h1>
        <Link className="deck-btn deck-btn--primary" href="/">
          발표 화면으로
        </Link>
      </header>
      {targetDate ? (
        <TodayInputPanel
          targetDate={targetDate}
          previousDate={meta?.previousDate}
          lastWeekByClass={meta?.lastWeekByClass}
          initialValues={meta?.live}
        />
      ) : (
        <div className="deck-state">불러오는 중…</div>
      )}
    </div>
  );
}
