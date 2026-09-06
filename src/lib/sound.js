"use client";

// 카드 넘길 때 나는 바람 소리. 파일을 두지 않고 Web Audio API로 그때그때 합성한다.
// 화이트 노이즈에 스윕하는 밴드패스 필터를 걸면 "휙" 지나가는 바람 소리가 난다.
let ctx = null;
let noiseBuffer = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// 노이즈 버퍼는 한 번만 만들어 재사용한다 (매번 새로 채우면 연타할 때 버벅일 수 있다).
function getNoiseBuffer(audioCtx) {
  if (noiseBuffer && noiseBuffer.sampleRate === audioCtx.sampleRate) return noiseBuffer;
  const duration = 0.4;
  const length = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

/** direction: 1 = 다음 반(바람이 위로 스윕), -1 = 이전 반(아래로 스윕). */
export function playSwipeSound(direction = 1) {
  const audioCtx = getContext();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const source = audioCtx.createBufferSource();
  source.buffer = getNoiseBuffer(audioCtx);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.9;
  const [startFreq, endFreq] = direction >= 0 ? [650, 2200] : [2200, 650];
  filter.frequency.setValueAtTime(startFreq, now);
  filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.28);

  const gain = audioCtx.createGain();
  // 클릭음 방지를 위해 0에서 바로 시작하지 않고 아주 작은 값에서 올린다.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.4, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  source.start(now);
  source.stop(now + 0.34);
}
