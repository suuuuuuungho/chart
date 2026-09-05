"use client";

import { useId } from "react";
import { shortDate } from "@/lib/deck";

const W = 820;
const H = 400;
const PAD = { top: 46, right: 26, bottom: 46, left: 26 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const BASELINE = H - PAD.bottom;
const H_GRID_LINES = 4;

/**
 * 단조 3차 스플라인. Catmull-Rom과 달리 데이터 사이로 튀어나가지 않아
 * 실제 출석 수치에 없는 봉우리·골짜기를 만들지 않는다.
 */
function curvePath(pts) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  if (n === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;

  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }

  const m = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) {
      m[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (m[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

/** 값이 좁은 범위에 몰려도 추이가 보이도록 위아래로 여유를 준 눈금. */
function makeScale(values) {
  const known = values.filter((v) => v !== null);
  if (known.length === 0) return { min: 0, max: 1 };
  const lo = Math.min(...known);
  const hi = Math.max(...known);
  if (hi === lo) return { min: Math.max(0, lo - 2), max: lo + 2 };
  const span = hi - lo;
  return { min: Math.max(0, lo - span * 0.4), max: hi + span * 0.3 };
}

/**
 * 8주 출석 인원 추이. 단일 시리즈라 범례 없이 카드 제목이 시리즈를 지칭하고,
 * 모든 점에 값을 직접 적는다 (발표 중에는 hover로 확인할 수 없다).
 */
export default function AttendanceChart({ points }) {
  const gradientId = useId();
  const values = points.map((p) => (typeof p.present === "number" ? p.present : null));
  const { min, max } = makeScale(values);
  const band = PLOT_W / (points.length - 1 || 1);
  const lastIndex = points.length - 1;

  const toY = (v) => BASELINE - ((v - min) / (max - min)) * PLOT_H;
  const toX = (i) => PAD.left + band * i;

  const known = values
    .map((v, i) => (v === null ? null : { x: toX(i), y: toY(v), i }))
    .filter(Boolean);

  const line = curvePath(known);
  const area =
    known.length > 1
      ? `${line} L${known[known.length - 1].x},${BASELINE} L${known[0].x},${BASELINE} Z`
      : "";

  return (
    <svg
      className="att-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`최근 ${points.length}주 출석 인원 추이`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="att-chart__fade-top" />
          <stop offset="100%" className="att-chart__fade-bottom" />
        </linearGradient>
      </defs>

      {/* 점선 격자 (가로 + 세로) */}
      <g className="att-chart__grid">
        {Array.from({ length: H_GRID_LINES }, (_, row) => {
          const y = PAD.top + (PLOT_H / (H_GRID_LINES - 1)) * row;
          return <line key={`h${row}`} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} />;
        })}
        {points.map((point, i) => (
          <line key={`v${point.date}`} x1={toX(i)} y1={PAD.top} x2={toX(i)} y2={BASELINE} />
        ))}
      </g>

      {area ? <path className="att-chart__area" d={area} fill={`url(#${gradientId})`} /> : null}
      {line ? <path className="att-chart__line" d={line} pathLength="1" /> : null}

      {points.map((point, i) => {
        const cx = toX(i);
        const isToday = i === lastIndex;
        const value = values[i];
        const label = shortDate(point.date);

        if (value === null) {
          // 미입력: 값이 있는 것처럼 보이지 않도록 점선 자리 표시만 남긴다.
          return (
            <g key={point.date}>
              <line
                className="att-chart__pending"
                x1={cx}
                y1={PAD.top}
                x2={cx}
                y2={BASELINE}
              />
              <text x={cx} y={PAD.top - 16} className="att-chart__value att-chart__value--pending">
                입력 대기
              </text>
              <text x={cx} y={BASELINE + 22} className="att-chart__x-label att-chart__x-label--today">
                {label}
              </text>
              <text x={cx} y={BASELINE + 38} className="att-chart__x-note">
                오늘
              </text>
            </g>
          );
        }

        const cy = toY(value);
        return (
          <g key={point.date} className="att-chart__point">
            <title>{`${label} · ${value}명`}</title>
            {/* 커서를 정확히 맞추지 않아도 잡히도록 넉넉한 히트 영역 */}
            <circle className="att-chart__hit" cx={cx} cy={cy} r={22} />
            <circle
              className={isToday ? "att-chart__dot att-chart__dot--today" : "att-chart__dot"}
              cx={cx}
              cy={cy}
              r={isToday ? 6.5 : 5}
            />
            <text
              x={cx}
              y={cy - 18}
              className={isToday ? "att-chart__value att-chart__value--today" : "att-chart__value"}
            >
              {value}
            </text>
            <text
              x={cx}
              y={BASELINE + 22}
              className={isToday ? "att-chart__x-label att-chart__x-label--today" : "att-chart__x-label"}
            >
              {label}
            </text>
            {isToday ? (
              <text x={cx} y={BASELINE + 38} className="att-chart__x-note">
                오늘
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
