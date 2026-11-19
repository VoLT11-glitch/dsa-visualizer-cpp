import type { SortState } from '../../core/types';

export function SortView({ s }: { s: SortState }) {
  const n = s.arr.length;
  const lo = Math.min(0, ...s.arr);
  const hi = Math.max(1, ...s.arr);
  const sorted = new Set(s.sorted);
  const showVals = n <= 32;
  const h = (v: number) => 6 + ((v - lo) / (hi - lo || 1)) * 94;
  return (
    <div className="sort-view">
      <div className="bars" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {s.arr.map((v, i) => {
          const mark = s.marks[i];
          const inside = !!s.range && i >= s.range[0] && i <= s.range[1];
          const out = !!s.range && !inside && s.rangeMode !== 'window';
          const win = inside && s.rangeMode === 'window';
          const cls = ['bar', mark ? `m-${mark}` : sorted.has(i) ? 'm-sorted' : win ? 'm-window' : '', out ? 'dim' : ''].join(' ');
          return (
            <div key={i} className="bar-col" title={`a[${i}] = ${v}`}>
              {showVals && <span className="bar-val">{v}</span>}
              <div className={cls} style={{ height: `${h(v)}%` }} />
            </div>
          );
        })}
      </div>
      {showVals && (
        <div className="idx-row" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {s.arr.map((_, i) => <span key={i}>{i}</span>)}
        </div>
      )}
      {s.aux && (
        <div className="aux">
          <span className="muted">{s.auxLabel ?? 'aux'}:</span>
          {s.aux.length ? s.aux.map((v, i) => <span key={i} className="chip">{v}</span>) : <span className="muted">[ ]</span>}
        </div>
      )}
    </div>
  );
}
