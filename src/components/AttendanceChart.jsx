"use client";

import { shortDate } from "@/lib/deck";

const W = 460;
const H = 216;
const PAD = { top: 32, right: 12, bottom: 40, left: 12 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const BASELINE = H - PAD.bottom;
const BAR_RATIO = 0.6;
const ZERO_STUB = 2;

/** 상단만 둥근 막대 (baseline 앵커). */
function barPath(x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

/**
 * 8주 출석 인원 컬럼 차트. 단일 시리즈이므로 범례 없이 제목이 시리즈를 지칭한다.
 * 당일 막대만 흰 링 + 굵은 라벨로 강조 — 색 단독이 아닌 이중 표기.
 */
export default function AttendanceChart({ points }) {
  const values = points.map((p) => (typeof p.present === "number" ? p.present : null));
  const max = Math.max(1, ...values.filter((v) => v !== null));
  const band = PLOT_W / points.length;
  const barW = band * BAR_RATIO;
  const lastIndex = points.length - 1;

  return (
    <svg
      className="att-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`최근 ${points.length}주 출석 인원 추이`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* 막대마다 값을 직접 적으므로 격자선과 y축 눈금은 두지 않고 baseline만 남긴다. */}
      <line
        x1={PAD.left}
        y1={BASELINE}
        x2={W - PAD.right}
        y2={BASELINE}
        className="att-chart__baseline"
      />

      {points.map((point, i) => {
        const cx = PAD.left + band * i + band / 2;
        const x = cx - barW / 2;
        const isToday = i === lastIndex;
        const value = values[i];
        const label = shortDate(point.date);

        if (value === null) {
          // 미입력: 값이 있는 것처럼 보이지 않도록 전체 높이 점선 윤곽으로만 자리를 표시한다.
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={PAD.top}
                width={barW}
                height={PLOT_H}
                rx="4"
                className="att-chart__pending"
              />
              <text x={cx} y={PAD.top - 12} className="att-chart__value att-chart__value--pending">
                입력 대기
              </text>
              <text x={cx} y={BASELINE + 18} className="att-chart__x-label att-chart__x-label--today">
                {label}
              </text>
              <text x={cx} y={BASELINE + 33} className="att-chart__x-note">
                오늘
              </text>
            </g>
          );
        }

        const h = value === 0 ? ZERO_STUB : Math.max(ZERO_STUB, (value / max) * PLOT_H);
        const y = BASELINE - h;

        return (
          <g key={point.date}>
            <title>{`${label} · ${value}명`}</title>
            <path
              d={barPath(x, y, barW, h, 4)}
              className={value === 0 ? "att-chart__bar att-chart__bar--zero" : "att-chart__bar"}
            />
            {isToday ? (
              <path d={barPath(x, y, barW, h, 4)} className="att-chart__bar-ring" />
            ) : null}
            <text
              x={cx}
              y={y - 8}
              className={isToday ? "att-chart__value att-chart__value--today" : "att-chart__value"}
            >
              {value}
            </text>
            <text
              x={cx}
              y={BASELINE + 18}
              className={isToday ? "att-chart__x-label att-chart__x-label--today" : "att-chart__x-label"}
            >
              {label}
            </text>
            {isToday ? (
              <text x={cx} y={BASELINE + 33} className="att-chart__x-note">
                오늘
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
