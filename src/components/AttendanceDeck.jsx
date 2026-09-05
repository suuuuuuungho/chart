"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CardSwap, { Card } from "@/components/CardSwap";
import ClassCard from "@/components/ClassCard";
import DeckBackground from "@/components/DeckBackground";
import { isISODate, longDate, resolveTargetSunday } from "@/lib/deck";
import { liveKey, pruneOldLiveInput, readLiveInput } from "@/lib/liveInput";
import "@/components/deck.css";

export default function AttendanceDeck() {
  const [targetDate, setTargetDate] = useState(null);
  const [data, setData] = useState(null);
  const [live, setLive] = useState({});
  const [status, setStatus] = useState("loading");

  const swapRef = useRef(null);

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
  }, []);

  // /input은 별도 화면이라, 거기서 입력한 값이 이 화면에 바로 반영되도록 저장소 변경을 듣는다.
  useEffect(() => {
    if (!targetDate) return undefined;
    const key = liveKey(targetDate);
    const onStorage = (event) => {
      if (event.key === null || event.key === key) setLive(readLiveInput(targetDate));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [targetDate]);

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

  // 화면에 조작 버튼을 두지 않으므로 방향키(발표용 리모컨 포함)로만 넘긴다.
  useEffect(() => {
    if (cards.length === 0) return undefined;
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
  }, [cards.length, goNext, goPrev]);

  return (
    <div className="deck-root deck-root--backdrop">
      <DeckBackground />

      <div className="deck-side">
        <span className="deck-badge">
          <b>중등부예배</b>
          <span>중등부 · 20개 반</span>
        </span>

        <header className="deck-top">
          <h1 className="deck-top__title">
            중등부 예배 반별
            <br />
            <em>예배 출석 추이</em>
          </h1>
          <p className="deck-top__date">
            {targetDate ? `${longDate(targetDate)} 기준 · 최근 8주` : " "}
          </p>
        </header>

        {status === "error" ? (
          <p className="deck-state deck-state--error">
            출석 데이터를 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        ) : null}
      </div>

      {cards.length > 0 ? (
        <div className="deck-stage">
          <CardSwap
            ref={swapRef}
            width={860}
            height={492}
            cardDistance={40}
            verticalDistance={36}
          >
            {cards.map((card) => (
              <Card key={card.key}>
                <ClassCard card={card} />
              </Card>
            ))}
          </CardSwap>
        </div>
      ) : null}
    </div>
  );
}
