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
  const percent =
    previous > 0 ? ` (${up ? "+" : "−"}${Math.round((Math.abs(diff) / previous) * 100)}%)` : "";
  return (
    <span className={`class-card__delta ${up ? "class-card__delta--up" : "class-card__delta--down"}`}>
      <span aria-hidden="true">{up ? "▲" : "▼"}</span>
      {` 전주 대비 ${Math.abs(diff)}명 ${up ? "증가" : "감소"}`}
      <span className="class-card__delta-pct">{percent}</span>
    </span>
  );
}

export default function ClassCard({ card, yScale, color, lateColor, latePoints }) {
  const points = card.points;
  const todayPoint = points[points.length - 1];
  const today = todayPoint?.present ?? null;
  const previous = points[points.length - 2]?.present ?? null;
  const partial =
    todayPoint?.source === "live" && todayPoint.enteredClasses < todayPoint.totalClasses;

  return (
    <div className="class-card">
      <div className="class-card__bar">
        <span className="class-card__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="class-card__tag">
          <h2 className="class-card__tag-name">{card.title}</h2>
          <span className="class-card__tag-sub">{card.subtitle}</span>
        </span>
      </div>

      <div className="class-card__body">
        <div className="class-card__head">
          <div className="class-card__meta">
            <Delta today={today} previous={previous} />
            {partial ? (
              <span className="deck-flag">
                일부 입력 {todayPoint.enteredClasses}/{todayPoint.totalClasses}반
              </span>
            ) : null}
            {latePoints ? (
              <span className="chart-legend">
                <span className="chart-legend__item">
                  <i style={{ background: color }} />
                  참석
                </span>
                <span className="chart-legend__item">
                  <i style={{ background: lateColor }} />
                  지각
                </span>
              </span>
            ) : null}
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
        </div>

        <AttendanceChart
          points={points}
          yScale={yScale}
          color={color}
          secondary={latePoints ? { values: latePoints, color: lateColor } : undefined}
        />
      </div>
    </div>
  );
}
