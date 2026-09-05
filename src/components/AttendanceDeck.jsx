"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CardSwap, { Card } from "@/components/CardSwap";
import ClassCard from "@/components/ClassCard";
import TodayInputPanel from "@/components/TodayInputPanel";
import { isISODate, longDate, resolveTargetSunday, shortLabel } from "@/lib/deck";
import { pruneOldLiveInput, readLiveInput } from "@/lib/liveInput";
import "@/components/deck.css";

const SWIPE_THRESHOLD = 48;

export default function AttendanceDeck() {
  const [targetDate, setTargetDate] = useState(null);
  const [data, setData] = useState(null);
  const [live, setLive] = useState({});
  const [status, setStatus] = useState("loading");
  const [reloadToken, setReloadToken] = useState(0);
  const [index, setIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const swapRef = useRef(null);
  const pointer = useRef(null);

  // 기준 일요일은 브라우저의 로컬 시간대에서 계산한다 (서버는 UTC라 하루가 어긋날 수 있다).
  useEffect(() => {
    const override = new URLSearchParams(window.location.search).get("date");
    const resolved = isISODate(override) ? override : resolveTargetSunday();
    pruneOldLiveInput(resolved);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/attendance?date=${resolved}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setTargetDate(resolved);
        setData(json);
        setLive(readLiveInput(resolved));
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setTargetDate(resolved);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const refresh = useCallback(() => {
    setStatus((prev) => (prev === "ready" ? "refreshing" : "loading"));
    setReloadToken((n) => n + 1);
  }, []);

  // 당일 값: DB에 그 주가 적재됐으면 DB 우선, 아니면 이 기기의 임시 입력값.
  const cards = useMemo(() => {
    if (!data) return [];
    return data.cards.map((card) => {
      const points = card.points.slice();
      const lastIndex = points.length - 1;
      const last = points[lastIndex];
      if (last.present === null && !data.todayInDb) {
        const entered = card.classes.filter((name) => typeof live[name] === "number");
        if (entered.length > 0) {
          points[lastIndex] = {
            ...last,
            present: entered.reduce((sum, name) => sum + live[name], 0),
            source: "live",
            enteredClasses: entered.length,
            totalClasses: card.classes.length,
          };
        }
      }
      return { ...card, points };
    });
  }, [data, live]);

  const goNext = useCallback(() => swapRef.current?.next(), []);
  const goPrev = useCallback(() => swapRef.current?.prev(), []);

  useEffect(() => {
    if (panelOpen || cards.length === 0) return undefined;
    const onKey = (event) => {
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, cards.length, goNext, goPrev]);

  const handlePointerDown = (event) => {
    pointer.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event) => {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const current = cards[index];

  return (
    <div className="deck-root">
      <header className="deck-top">
        <div>
          <h1 className="deck-top__title">중등부 반별 예배 출석 추이</h1>
          <p className="deck-top__date">
            {targetDate ? `${longDate(targetDate)} 기준 · 최근 8주` : " "}
            {data?.todayInDb ? " · 당일 데이터 적재 완료" : ""}
          </p>
        </div>
        <div className="deck-top__actions">
          {!data?.todayInDb ? (
            <button type="button" className="deck-btn" onClick={() => setPanelOpen(true)}>
              당일 인원 입력
            </button>
          ) : null}
          <button
            type="button"
            className="deck-btn deck-btn--primary"
            onClick={refresh}
            disabled={status === "loading" || status === "refreshing"}
          >
            {status === "refreshing" ? "새로고침 중…" : "새로고침"}
          </button>
        </div>
      </header>

      {status === "error" ? (
        <div className="deck-state deck-state--error">
          출석 데이터를 불러오지 못했습니다. 새로고침을 눌러 다시 시도해 주세요.
        </div>
      ) : null}

      {status === "loading" ? <div className="deck-state">불러오는 중…</div> : null}

      {cards.length > 0 ? (
        <>
          <div
            className="deck-stage"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            <CardSwap ref={swapRef} width={520} height={400} onIndexChange={setIndex}>
              {cards.map((card) => (
                <Card key={card.key}>
                  <ClassCard card={card} />
                </Card>
              ))}
            </CardSwap>
          </div>

          <div className="deck-controls">
            <button
              type="button"
              className="deck-btn deck-btn--round"
              onClick={goPrev}
              aria-label="이전 반"
            >
              ‹
            </button>
            <span className="deck-controls__position" aria-live="polite">
              {index + 1} / {cards.length} · <b>{current?.title}</b>
            </span>
            <button
              type="button"
              className="deck-btn deck-btn--round"
              onClick={goNext}
              aria-label="다음 반"
            >
              ›
            </button>
          </div>

          <nav className="deck-jump" aria-label="반 바로가기">
            {cards.map((card, i) => (
              <button
                key={card.key}
                type="button"
                className="deck-jump__chip"
                aria-current={i === index}
                onClick={() => swapRef.current?.goTo(i)}
              >
                {shortLabel(card.key)}
              </button>
            ))}
          </nav>
        </>
      ) : null}

      {panelOpen && targetDate ? (
        <div className="deck-panel" role="dialog" aria-label="당일 출석 인원 입력">
          <div className="deck-panel__head">
            <h2 className="deck-panel__title">당일 출석 인원 입력</h2>
            <button
              type="button"
              className="deck-btn deck-btn--primary"
              onClick={() => setPanelOpen(false)}
            >
              발표 화면으로
            </button>
          </div>
          <TodayInputPanel
            targetDate={targetDate}
            previousDate={data?.previousDate}
            lastWeekByClass={data?.lastWeekByClass}
            onChange={setLive}
          />
        </div>
      ) : null}
    </div>
  );
}
