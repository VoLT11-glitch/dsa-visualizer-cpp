import type { TNode, TreeState } from '../../core/types';

function layout(nodes: TNode[], root: number | null) {
  const pos = new Map<number, { x: number; d: number }>();
  let x = 0;
  let maxD = 0;
  const walk = (id: number | null, d: number) => {
    if (id === null) return;
    walk(nodes[id].left, d + 1);
    pos.set(id, { x: x++, d });
    maxD = Math.max(maxD, d);
    walk(nodes[id].right, d + 1);
  };
  walk(root, 0);
  return { pos, cols: Math.max(1, x), rows: maxD + 1 };
}

export function TreeView({ s }: { s: TreeState }) {
  const { pos, cols, rows } = layout(s.nodes, s.root);
  const W = Math.max(320, cols * 52);
  const H = Math.max(120, rows * 70 + 30);
  const px = (id: number) => ((pos.get(id)!.x + 0.5) / cols) * W;
  const py = (id: number) => 34 + pos.get(id)!.d * 70;
  const path = new Set(s.path);
  const out = new Set(s.output.length ? s.nodes.filter((n) => s.output.includes(n.val)).map((n) => n.id) : []);
  return (
    <div className="tree-view">
      {s.root === null ? (
        <div className="empty-tree muted">Empty tree — root = nullptr</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="tree-svg" style={{ maxHeight: 360 }}>
          {s.nodes.map((n) =>
            [n.left, n.right].map((c) =>
              c === null || !pos.has(c) || !pos.has(n.id) ? null : (
                <line key={`${n.id}-${c}`} x1={px(n.id)} y1={py(n.id)} x2={px(c)} y2={py(c)}
                  className={`edge ${path.has(n.id) && (path.has(c) || s.current === c) ? 'tree' : ''}`} />
              ),
            ),
          )}
          {s.nodes.map((n) => {
            if (!pos.has(n.id)) return null;
            const cls = s.current === n.id ? 'cur' : s.fresh === n.id ? 'done' : path.has(n.id) ? 'front' : out.has(n.id) ? 'seen' : '';
            return (
              <g key={n.id} className={`gnode ${cls}`}>
                <circle cx={px(n.id)} cy={py(n.id)} r={19} />
                <text x={px(n.id)} y={py(n.id) + 5} className="gnode-label">{n.val}</text>
              </g>
            );
          })}
        </svg>
      )}
      {s.output.length > 0 && (
        <div className="aux">
          <span className="muted">out:</span>
          {s.output.map((v, i) => <span key={i} className="chip ok">{v}</span>)}
        </div>
      )}
    </div>
  );
}
