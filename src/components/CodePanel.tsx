import { useEffect, useRef } from 'react';
import { highlight } from '../core/cpp';

interface Props {
  code: string[];
  line: number;
  title?: string;
  /** Quiz mode: lines become clickable; `feedback` colours the guess and the right answer. */
  onLineClick?: (line: number) => void;
  feedback?: { right: number; wrong?: number } | null;
}

export function CodePanel({ code, line, title = 'C++', onLineClick, feedback }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-active="true"]');
    const box = ref.current;
    if (!el || !box) return;
    const top = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [line]);
  const quiz = !!onLineClick;
  return (
    <div className={`code-panel ${quiz ? 'quiz' : ''}`}>
      <div className="panel-title">
        <span>{title}</span>
        {line > 0 && <span className="muted">line {line}</span>}
      </div>
      <div className="code-scroll" ref={ref}>
        <pre className="code">
          {code.map((l, i) => {
            const n = i + 1;
            const fb = feedback ? (n === feedback.right ? 'right' : n === feedback.wrong ? 'wrong' : undefined) : undefined;
            return (
              <div
                key={i}
                className="code-line"
                data-active={n === line}
                data-fb={fb}
                onClick={quiz && l.trim() ? () => onLineClick(n) : undefined}
                role={quiz && l.trim() ? 'button' : undefined}
              >
                <span className="ln">{n}</span>
                <span className="src">
                  {highlight(l).map((t, k) => (
                    <span key={k} className={`tok-${t.t}`}>{t.s}</span>
                  ))}
                  {l === '' && ' '}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
