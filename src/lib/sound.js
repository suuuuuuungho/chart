"use client";

// 카드 넘길 때 나는 짧은 효과음. 파일을 두지 않고 Web Audio API로 그때그때 합성한다.
let ctx = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** direction: 1 = 다음 반(음 상승), -1 = 이전 반(음 하강). */
export function playSwipeSound(direction = 1) {
  const audioCtx = getContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  const [startFreq, endFreq] = direction >= 0 ? [720, 480] : [480, 720];
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.11);

  // 클릭음 방지를 위해 0에서 바로 시작하지 않고 아주 작은 값에서 올린다.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}
