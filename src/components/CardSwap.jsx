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

// 카드가 20장이라 전부 쌓으면 뒤쪽이 화면 밖으로 날아간다.
// 앞에서부터 이 깊이까지만 보이게 하고 나머지는 같은 자리에 숨긴다.
const VISIBLE_DEPTH = 3;

// 보이는 카드 + 사라지는 한 장만 트윈하고 나머지는 즉시 배치한다.
// (20장 전부 스태거로 움직이면 전환 한 번이 1.4초까지 늘어진다.)
const TWEEN_DEPTH = VISIBLE_DEPTH + 1;

// 연타를 몇 장까지 기억할지.
const QUEUE_LIMIT = 5;

const makeSlot = (i, distX, distY, total) => {
  const depth = Math.min(i, VISIBLE_DEPTH);
  return {
    x: depth * distX,
    y: -depth * distY,
    z: -depth * distX * 1.5,
    zIndex: total - i,
    visible: i <= VISIBLE_DEPTH
  };
};

const placeNow = (el, slot, skew) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    autoAlpha: slot.visible ? 1 : 0,
    force3D: true
  });

/**
 * 수동 전용 카드 덱. 자동 순환은 없고 ref로 next/prev/goTo를 호출한다.
 */
const CardSwap = forwardRef(function CardSwap(
  {
    width = 520,
    height = 400,
    cardDistance = 52,
    verticalDistance = 56,
    // 차트 숫자를 읽어야 하는 화면이라 기울이지 않는다.
    skewAmount = 0,
    easing = 'power',
    onIndexChange,
    children
  },
  ref
) {
  const config = useMemo(
    () =>
      easing === 'elastic'
        ? {
            ease: 'elastic.out(0.6,0.9)',
            durDrop: 1.2,
            durMove: 1.2,
            durReturn: 1.2,
            promoteOverlap: 0.9,
            returnDelay: 0.05
          }
        : {
            ease: 'power2.inOut',
            durDrop: 0.34,
            durMove: 0.34,
            durReturn: 0.34,
            promoteOverlap: 0.6,
            returnDelay: 0.15
          },
    [easing]
  );

  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(
    () => childArr.map(() => React.createRef()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArr.length]
  );

  const order = useRef([]);
  const tlRef = useRef(null);
  const busy = useRef(false);
  const container = useRef(null);

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
  const emit = useCallback(() => onIndexChangeRef.current?.(order.current[0] ?? 0), []);

  const layout = useCallback(() => {
    const total = refs.length;
    order.current.forEach((cardIdx, slotIdx) => {
      const el = refs[cardIdx]?.current;
      if (el) placeNow(el, makeSlot(slotIdx, cardDistance, verticalDistance, total), skewAmount);
    });
  }, [refs, cardDistance, verticalDistance, skewAmount]);

  useEffect(() => {
    // 초기 위치는 항상 0번 카드라 부모에 따로 알릴 필요가 없다.
    order.current = Array.from({ length: refs.length }, (_, i) => i);
    layout();
    return () => {
      tlRef.current?.kill();
      busy.current = false;
    };
  }, [refs, layout]);

  const next = useCallback(() => {
    const total = refs.length;
    if (total < 2) return;
    if (busy.current) {
      enqueue(1);
      return;
    }
    busy.current = true;

    const [front, ...rest] = order.current;
    const elFront = refs[front].current;
    const tl = gsap.timeline({ onComplete: finish });
    tlRef.current = tl;

    tl.to(elFront, { y: '+=500', duration: config.durDrop, ease: config.ease });
    tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);

    rest.forEach((cardIdx, i) => {
      const el = refs[cardIdx].current;
      const slot = makeSlot(i, cardDistance, verticalDistance, total);
      if (i > TWEEN_DEPTH) {
        tl.set(el, { x: slot.x, y: slot.y, z: slot.z, zIndex: slot.zIndex, autoAlpha: 0 }, 'promote');
        return;
      }
      tl.set(el, { zIndex: slot.zIndex }, 'promote');
      tl.to(
        el,
        {
          x: slot.x,
          y: slot.y,
          z: slot.z,
          autoAlpha: slot.visible ? 1 : 0,
          duration: config.durMove,
          ease: config.ease
        },
        `promote+=${i * 0.05}`
      );
    });

    const backSlot = makeSlot(total - 1, cardDistance, verticalDistance, total);
    tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
    tl.call(() => { gsap.set(elFront, { zIndex: backSlot.zIndex }); }, undefined, 'return');
    tl.to(
      elFront,
      {
        x: backSlot.x,
        y: backSlot.y,
        z: backSlot.z,
        autoAlpha: 0,
        duration: config.durReturn,
        ease: config.ease
      },
      'return'
    );
    tl.call(() => {
      order.current = [...rest, front];
      emit();
    });
  }, [refs, config, cardDistance, verticalDistance, emit, finish]);

  const prev = useCallback(() => {
    const total = refs.length;
    if (total < 2) return;
    if (busy.current) {
      enqueue(-1);
      return;
    }
    busy.current = true;

    const last = order.current[total - 1];
    const head = order.current.slice(0, -1);
    const elLast = refs[last].current;
    const frontSlot = makeSlot(0, cardDistance, verticalDistance, total);

    const tl = gsap.timeline({ onComplete: finish });
    tlRef.current = tl;

    // 들어올 카드를 맨 앞 자리 아래에 대기시킨 뒤 위로 올린다 (next의 거울상).
    tl.set(elLast, {
      x: frontSlot.x,
      y: frontSlot.y + 500,
      z: frontSlot.z,
      zIndex: total + 1,
      autoAlpha: 1
    });

    head.forEach((cardIdx, i) => {
      const el = refs[cardIdx].current;
      const slot = makeSlot(i + 1, cardDistance, verticalDistance, total);
      if (i + 1 > TWEEN_DEPTH) {
        tl.set(el, { x: slot.x, y: slot.y, z: slot.z, zIndex: slot.zIndex, autoAlpha: 0 }, 0);
        return;
      }
      tl.set(el, { zIndex: slot.zIndex }, 0);
      tl.to(
        el,
        {
          x: slot.x,
          y: slot.y,
          z: slot.z,
          autoAlpha: slot.visible ? 1 : 0,
          duration: config.durMove,
          ease: config.ease
        },
        0
      );
    });

    tl.to(
      elLast,
      { y: frontSlot.y, duration: config.durReturn, ease: config.ease },
      config.durMove * 0.35
    );
    tl.call(() => {
      gsap.set(elLast, { zIndex: frontSlot.zIndex });
      order.current = [last, ...head];
      emit();
    });
  }, [refs, config, cardDistance, verticalDistance, emit, finish]);

  nextRef.current = next;
  prevRef.current = prev;

  // 20장을 순차로만 오가면 되돌아가기가 번거로워 바로 점프할 수 있게 한다.
  const goTo = useCallback(
    (index) => {
      const total = refs.length;
      if (total === 0) return;
      const target = ((index % total) + total) % total;
      if (order.current[0] === target) return;

      tlRef.current?.kill();
      busy.current = false;
      queued.current = 0;
      order.current = Array.from({ length: total }, (_, i) => (target + i) % total);
      layout();

      const el = refs[target].current;
      if (el) gsap.fromTo(el, { autoAlpha: 0.25 }, { autoAlpha: 1, duration: 0.22, ease: 'power2.out' });
      emit();
    },
    [refs, layout, emit]
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
    <div ref={container} className="card-swap-container" style={{ width, height }}>
      {rendered}
    </div>
  );
});

export default CardSwap;
