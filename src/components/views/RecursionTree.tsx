import type { CallNode } from '../../core/types';

/** Lays out calls like a tidy tree: leaves left to right, parents centred over their children. */
function layout(calls: CallNode[]) {
  const kids = new Map<number | null, number[]>();
  for (const c of calls) kids.set(c.parent, [...(kids.get(c.parent) ?? []), c.id]);
  const pos = new Map<number, { x: number; d: number }>();
  let leaf = 0;
  let maxD = 0;
  const walk = (id: number, d: number): number => {
    maxD = Math.max(maxD, d);
    const ch = kids.get(id) ?? [];
    if (!ch.length) {
      pos.set(id, { x: leaf++, d });
      return leaf - 1;
    }
    const xs = ch.map((c) => walk(c, d + 1));
    const x = (xs[0] + xs[xs.length - 1]) / 2;
    pos.set(id, { x, d });
    return x;
  };
  for (const r of kids.get(null) ?? []) walk(r, 0);
  return { pos, cols: Math.max(1, leaf), rows: maxD + 1 };
}

export function RecursionTree({ calls, active }: { calls: CallNode[]; active: number | null | undefined }) {
  if (!calls.length) return null;
  const { pos, cols, rows } = layout(calls);
  const boxW = Math.max(58, Math.max(...calls.map((c) => c.label.length)) * 6.9 + 12);
  const colW = boxW + 6;
  const rowH = 52;
  const W = Math.max(300, cols * colW);
  const H = rows * rowH + 10;
  const px = (id: number) => (pos.get(id)!.x + 0.5) * colW;
  const py = (id: number) => 22 + pos.get(id)!.d * rowH;
  const onStack = new Set<number>();
  for (let a = active ?? null; a !== null; a = calls[a].parent) onStack.add(a);
  return (
    <div className="rec-tree">
      <div className="rec-head">
        <span className="panel-label">Recursion tree</span>
        <span className="legend">
          <span><i className="sw cur" />running</span>
          <span><i className="sw front" />waiting on a child</span>
          <span><i className="sw done" />returned</span>
        </span>
      </div>
      <div className="rec-scroll">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {calls.map((c) => c.parent !== null && (
            <line key={`e${c.id}`} x1={px(c.parent)} y1={py(c.parent)} x2={px(c.id)} y2={py(c.id)}
              className={`edge ${onStack.has(c.id) ? 'tree' : ''}`} />
          ))}
          {calls.map((c) => {
            const cls = c.id === active ? 'cur' : onStack.has(c.id) ? 'front' : c.done ? 'done' : '';
            return (
              <g key={c.id} className={`call ${cls}`}>
                <rect x={px(c.id) - boxW / 2} y={py(c.id) - 12} width={boxW} height={24} rx={6} />
                <text x={px(c.id)} y={py(c.id) + 4}>{c.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
