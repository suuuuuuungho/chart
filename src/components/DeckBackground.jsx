"use client";

import dynamic from "next/dynamic";
import "@/components/DeckBackground.css";

// 배경은 SSR할 이유가 없고, DotField는 SVG filter id를 Math.random()으로 만들어
// 서버/클라이언트 마크업이 어긋난다. 클라이언트에서만 띄운다.
const ColorBends = dynamic(() => import("@/components/ColorBends"), { ssr: false });
const DotField = dynamic(() => import("@/components/DotField"), { ssr: false });

const ACCENT = "#A855F7";

/**
 * 발표 화면 배경: ColorBends(색 띠) 위에 DotField(점 격자)를 겹친다.
 * 카드의 스와이프/클릭을 가로채지 않도록 레이어 전체가 pointer-events: none이다.
 * (DotField는 window에서 마우스를 듣기 때문에 그래도 커서에 반응한다.)
 */
export default function DeckBackground() {
  return (
    <div className="deck-bg" aria-hidden="true">
      <div className="deck-bg__layer deck-bg__bends">
        <ColorBends
          className=""
          colors={[ACCENT]}
          speed={0.2}
          frequency={1.0}
          noise={0.15}
          bandWidth={2}
          rotation={90}
          iterations={1}
          intensity={1.3}
        />
      </div>

      <div className="deck-bg__layer deck-bg__dots">
        <DotField
          dotRadius={1.5}
          dotSpacing={14}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
        />
      </div>

      {/* 헤더·조작부 글자가 배경 위에서도 읽히도록 위아래를 눌러준다. */}
      <div className="deck-bg__scrim" />
    </div>
  );
}
