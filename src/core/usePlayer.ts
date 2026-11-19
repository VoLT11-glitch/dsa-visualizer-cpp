import { useCallback, useEffect, useRef, useState } from 'react';

/** Speed 1..10 -> delay in ms (roughly 1200ms down to 25ms). */
export const speedToDelay = (s: number) => Math.round(1200 * Math.pow(0.65, s - 1));

export function usePlayer(count: number, resetKey: unknown) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [resetKey]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= countRef.current - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, speedToDelay(speed));
    return () => clearInterval(t);
  }, [playing, speed]);

  const last = Math.max(0, count - 1);
  const step = useCallback((d: number) => {
    setPlaying(false);
    setIdx((i) => Math.min(Math.max(0, i + d), Math.max(0, countRef.current - 1)));
  }, []);
  const toggle = useCallback(() => {
    setIdx((i) => (i >= countRef.current - 1 ? 0 : i));
    setPlaying((p) => !p);
  }, []);
  const seek = useCallback((i: number) => {
    setPlaying(false);
    setIdx(i);
  }, []);

  return { idx: Math.min(idx, last), last, playing, speed, setSpeed, step, toggle, seek };
}

export type Player = ReturnType<typeof usePlayer>;
