'use client';

import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef
} from 'react';
import gsap from 'gsap';
import './CardSwap.css';

export const Card = forwardRef(({ customClass, ...rest }, ref) => (
  <div ref={ref} {...rest} className={`card ${customClass ?? ''} ${rest.className ?? ''}`.trim()} />
));
Card.displayName = 'Card';

// 연타를 몇 장까지 기억할지.
const QUEUE_LIMIT = 5;

// 전환 중 옆으로 밀려나는 거리(px). 3D 스택 없이 크로스페이드 + 살짝 슬라이드만 준다.
const SLIDE_DISTANCE = 56;
const DURATION = 0.38;
const EASE = 'power2.inOut';

/**
 * 수동 전용 카드 덱. 한 번에 한 장만 보이고, next/prev는 나가는 카드가 반대편으로
 * 밀려나며 사라지는 동안 들어오는 카드가 같은 방향에서 밀려들어오며 나타나는
 * 크로스페이드로 전환한다. 자동 순환은 없고 ref로 next/prev/goTo를 호출한다.
 */
const CardSwap = forwardRef(function CardSwap({ width = 860, height = 596, onIndexChange, children }, ref) {
  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(
    () => childArr.map(() => React.createRef()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArr.length]
  );

  const current = useRef(0);
  const busy = useRef(false);
  const tlRef = useRef(null);

  // 발표 중 빠르게 연타해도 입력이 사라지지 않도록 남은 스텝을 큐에 쌓아둔다.
  const queued = useRef(0);
  const nextRef = useRef(null);
  const prevRef = useRef(null);
  const enqueue = (dir) => {
    queued.current = Math.max(-QUEUE_LIMIT, Math.min(QUEUE_LIMIT, queued.current + dir));
  };
  const finish = useCallback(() => {
    busy.current = false;
    if (queued.current > 0) {
      queued.current -= 1;
      nextRef.current?.();
    } else if (queued.current < 0) {
      queued.current += 1;
      prevRef.current?.();
    }
  }, []);

  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;
  const emit = useCallback(() => onIndexChangeRef.current?.(current.current), []);

  const placeAll = useCallback(() => {
    refs.forEach((r, i) => {
      const el = r.current;
      if (!el) return;
      gsap.set(el, {
        x: 0,
        xPercent: -50,
        yPercent: -50,
        zIndex: i === current.current ? 2 : 1,
        autoAlpha: i === current.current ? 1 : 0
      });
    });
  }, [refs]);

  useEffect(() => {
    current.current = 0;
    placeAll();
    return () => {
      tlRef.current?.kill();
      busy.current = false;
    };
  }, [refs, placeAll]);

  const transition = useCallback(
    (dir) => {
      const total = refs.length;
      if (total < 2) return;
      if (busy.current) {
        enqueue(dir);
        return;
      }
      busy.current = true;

      const fromIndex = current.current;
      const toIndex = ((fromIndex + dir) % total + total) % total;
      const fromEl = refs[fromIndex].current;
      const toEl = refs[toIndex].current;

      gsap.set(toEl, { x: dir > 0 ? SLIDE_DISTANCE : -SLIDE_DISTANCE, autoAlpha: 0, zIndex: 2 });
      gsap.set(fromEl, { zIndex: 1 });

      const tl = gsap.timeline({ onComplete: finish });
      tlRef.current = tl;
      tl.to(fromEl, { x: dir > 0 ? -SLIDE_DISTANCE : SLIDE_DISTANCE, autoAlpha: 0, duration: DURATION, ease: EASE }, 0);
      tl.to(toEl, { x: 0, autoAlpha: 1, duration: DURATION, ease: EASE }, 0);
      tl.call(() => {
        gsap.set(fromEl, { x: 0 });
        current.current = toIndex;
        emit();
      });
    },
    [refs, emit, finish]
  );

  const next = useCallback(() => transition(1), [transition]);
  const prev = useCallback(() => transition(-1), [transition]);
  nextRef.current = next;
  prevRef.current = prev;

  // 20장을 순차로만 오가면 되돌아가기가 번거로워 바로 점프할 수 있게 한다.
  const goTo = useCallback(
    (index) => {
      const total = refs.length;
      if (total === 0) return;
      const target = ((index % total) + total) % total;
      if (current.current === target) return;

      tlRef.current?.kill();
      busy.current = false;
      queued.current = 0;
      current.current = target;
      placeAll();

      const el = refs[target].current;
      if (el) gsap.fromTo(el, { autoAlpha: 0.25 }, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' });
      emit();
    },
    [refs, placeAll, emit]
  );

  useImperativeHandle(ref, () => ({ next, prev, goTo }), [next, prev, goTo]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child, {
          key: i,
          ref: refs[i],
          style: { width, height, ...(child.props.style ?? {}) }
        })
      : child
  );

  return (
    <div className="card-swap-container" style={{ width, height }}>
      {rendered}
    </div>
  );
});

export default CardSwap;
