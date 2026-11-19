import type { DPState } from '../../core/types';

export function DPView({ s }: { s: DPState }) {
  const has = (list: [number, number][], i: number, j: number) => list.some(([a, b]) => a === i && b === j);
  return (
    <div className="dp-view">
      <table className="dp">
        <thead>
          <tr>
            <th />
            {s.colHead.map((c, j) => <th key={j}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {s.table.map((row, i) => (
            <tr key={i}>
              <th className="rowh">{s.rowHead[i]}</th>
              {row.map((v, j) => {
                const cls = [
                  s.cur && s.cur[0] === i && s.cur[1] === j ? 'cur' : '',
                  has(s.deps, i, j) ? 'dep' : '',
                  has(s.path, i, j) ? 'path' : '',
                  v === null ? 'empty' : '',
                ].join(' ');
                return <td key={j} className={cls}>{v ?? ''}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="legend">
        <span><i className="sw cur" />current cell</span>
        <span><i className="sw front" />cells it reads</span>
        <span><i className="sw done" />answer path</span>
      </div>
    </div>
  );
}
