import { getAttendanceSeries } from "@/lib/attendance";
import { clearLiveDraft, writeLiveDraft } from "@/lib/liveDraft";
import { getDb } from "@/lib/turso";
import { isISODate, resolveTargetSunday } from "@/lib/deck";

// Route Handler는 기본적으로 캐시되지 않으므로 새로고침 버튼이 항상 최신 값을 받는다.
export async function GET(request) {
  const requested = new URL(request.url).searchParams.get("date");
  // 기준 일요일은 사용자의 로컬 시간대에서 계산해 넘겨받는다 (서버는 UTC).
  const targetDate = isISODate(requested) ? requested : resolveTargetSunday();

  try {
    const data = await getAttendanceSeries(targetDate);
    return Response.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[attendance] query failed", error);
    return Response.json({ error: "출석 데이터를 불러오지 못했습니다." }, { status: 500 });
  }
}

function sanitizeCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

/** /input에서 참석/지각 임시값을 저장한다. 기기가 달라도 같은 값이 보이도록 DB에 둔다. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { date, values } = body ?? {};
  if (!isISODate(date) || typeof values !== "object" || values === null) {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const sanitized = {};
  for (const [name, entry] of Object.entries(values)) {
    if (!entry || typeof entry !== "object") continue;
    const out = {};
    const present = sanitizeCount(entry.present);
    const late = sanitizeCount(entry.late);
    if (present !== undefined) out.present = present;
    if (late !== undefined) out.late = late;
    if (Object.keys(out).length > 0) sanitized[name] = out;
  }

  try {
    await writeLiveDraft(getDb(), date, sanitized);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[attendance] draft write failed", error);
    return Response.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
}

/** "전체 지우기": 그 주 임시값을 통째로 지운다. */
export async function DELETE(request) {
  const requested = new URL(request.url).searchParams.get("date");
  if (!isISODate(requested)) {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    await clearLiveDraft(getDb(), requested);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[attendance] draft clear failed", error);
    return Response.json({ error: "지우지 못했습니다." }, { status: 500 });
  }
}
