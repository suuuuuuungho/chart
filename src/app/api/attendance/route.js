import { getAttendanceSeries } from "@/lib/attendance";
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
