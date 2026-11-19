import { EDGES, NODES } from '../../algorithms/graph';
import type { GraphState } from '../../core/types';

const same = (e: [number, number] | null, u: number, v: number) => !!e && ((e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));

export function GraphView({ s, weighted }: { s: GraphState; weighted: boolean }) {
  const visited = new Set(s.visited);
  const frontier = new Set(s.frontier);
  const done = new Set(s.done);
  return (
    <div className="graph-view">
      <svg viewBox="0 0 640 360" className="graph-svg" role="img" aria-label="Graph">
        {EDGES.map(([u, v, w]) => {
          const a = NODES[u];
          const b = NODES[v];
          const tree = s.treeEdges.some((e) => same(e, u, v));
          const active = same(s.activeEdge, u, v);
          return (
            <g key={`${u}-${v}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={`edge ${tree ? 'tree' : ''} ${active ? 'active' : ''}`} />
              {weighted && (
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6} className="edge-w">{w}</text>
              )}
            </g>
          );
        })}
        {NODES.map((p, i) => {
          const cls = s.current === i ? 'cur' : done.has(i) ? 'done' : frontier.has(i) ? 'front' : visited.has(i) ? 'seen' : '';
          const d = s.dist?.[i];
          return (
            <g key={i} className={`gnode ${cls}`}>
              <circle cx={p.x} cy={p.y} r={22} />
              <text x={p.x} y={p.y + 5} className="gnode-label">{i}</text>
              {s.dist && (
                <text x={p.x} y={p.y - 30} className="dist">{d === null || d === undefined ? '∞' : d}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span><i className="sw cur" />current</span>
        <span><i className="sw front" />in {s.frontierLabel.split(' ')[0]}</span>
        <span><i className="sw done" />{s.dist ? 'finalized' : 'finished'}</span>
        <span><i className="sw seen" />discovered</span>
      </div>
      <div className="aux">
        <span className="muted">{s.frontierLabel}:</span>
        {s.frontierItems.length ? s.frontierItems.map((t, i) => <span key={i} className="chip">{t}</span>) : <span className="muted">empty</span>}
      </div>
      <div className="aux">
        <span className="muted">order:</span>
        {s.order.length ? s.order.map((t, i) => <span key={i} className="chip ok">{t}</span>) : <span className="muted">—</span>}
      </div>
    </div>
  );
}
