"use client";

import AttendanceChart from "@/components/AttendanceChart";

function Delta({ today, previous }) {
  if (typeof today !== "number" || typeof previous !== "number") {
    return <span className="class-card__delta class-card__delta--muted">전주 대비 —</span>;
  }
  const diff = today - previous;
  if (diff === 0) {
    return <span className="class-card__delta class-card__delta--flat">전주와 동일</span>;
  }
  const up = diff > 0;
  return (
    <span className={`class-card__delta ${up ? "class-card__delta--up" : "class-card__delta--down"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {` 전주 대비 ${Math.abs(diff)}명 ${up ? "증가" : "감소"}`}
    </span>
  );
}

export default function ClassCard({ card }) {
  const points = card.points;
  const todayPoint = points[points.length - 1];
  const today = todayPoint?.present ?? null;
  const previous = points[points.length - 2]?.present ?? null;
  const partial =
    todayPoint?.source === "live" && todayPoint.enteredClasses < todayPoint.totalClasses;

  return (
    <div className="class-card">
      <header className="class-card__head">
        <div>
          <h2 className="class-card__title">{card.title}</h2>
          <p className="class-card__subtitle">{card.subtitle}</p>
        </div>
        <div className="class-card__hero">
          {typeof today === "number" ? (
            <>
              <span className="class-card__hero-value">{today}</span>
              <span className="class-card__hero-unit">명</span>
            </>
          ) : (
            <span className="class-card__hero-pending">입력 대기</span>
          )}
        </div>
      </header>

      <div className="class-card__meta">
        <Delta today={today} previous={previous} />
        {partial ? (
          <span className="deck-flag">
            일부 입력 {todayPoint.enteredClasses}/{todayPoint.totalClasses}반
          </span>
        ) : null}
      </div>

      <AttendanceChart points={points} />
    </div>
  );
}
