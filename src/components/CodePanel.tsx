import { useEffect, useRef } from 'react';
import { highlight } from '../core/cpp';

export function CodePanel({ code, line, title = 'C++' }: { code: string[]; line: number; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-active="true"]');
    const box = ref.current;
    if (!el || !box) return;
    const top = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [line]);
  return (
    <div className="code-panel">
      <div className="panel-title">
        <span>{title}</span>
        {line > 0 && <span className="muted">line {line}</span>}
      </div>
      <div className="code-scroll" ref={ref}>
        <pre className="code">
          {code.map((l, i) => (
            <div key={i} className="code-line" data-active={i + 1 === line}>
              <span className="ln">{i + 1}</span>
              <span className="src">
                {highlight(l).map((t, k) => (
                  <span key={k} className={`tok-${t.t}`}>{t.s}</span>
                ))}
                {l === '' && ' '}
              </span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
