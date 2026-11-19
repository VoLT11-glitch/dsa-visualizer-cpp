import { useRef, useState } from 'react';
import type { Graph, GraphState } from '../../core/types';

const same = (e: [number, number] | null | undefined, u: number, v: number) =>
  !!e && ((e[0] === u && e[1] === v) || (e[0] === v && e[1] === u));
const R = 22;

interface Props {
  graph: Graph;
  s?: GraphState;
  weighted: boolean;
  directed?: boolean;
  editing?: boolean;
  onChange?: (g: Graph) => void;
}

/** Draws the graph and, in edit mode, lets you add/move/delete nodes and edges. */
export function GraphView({ graph, s, weighted, directed, editing, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const drag = useRef<{ id: number; moved: boolean } | null>(null);

  const toSvg = (e: React.PointerEvent | React.MouseEvent) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: Math.max(R, Math.min(640 - R, p.x)), y: Math.max(R + 10, Math.min(360 - R, p.y)) };
  };

  const set = (g: Graph) => onChange?.(g);
  const removeNode = (id: number) => {
    const map = (x: number) => (x > id ? x - 1 : x);
    set({
      nodes: graph.nodes.filter((_, i) => i !== id),
      edges: graph.edges.filter(([u, v]) => u !== id && v !== id).map(([u, v, w]) => [map(u), map(v), w]),
    });
    setSel(null);
  };

  const onBgClick = (e: React.MouseEvent) => {
    if (!editing) return;
    if (sel !== null) { setSel(null); return; }
    if (graph.nodes.length >= 12) return;
    set({ ...graph, nodes: [...graph.nodes, toSvg(e)] });
  };
  const onNodeDown = (e: React.PointerEvent, id: number) => {
    if (!editing) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { id, moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!editing || !drag.current) return;
    drag.current.moved = true;
    const p = toSvg(e);
    set({ ...graph, nodes: graph.nodes.map((n, i) => (i === drag.current!.id ? p : n)) });
  };
  const onNodeUp = (e: React.PointerEvent, id: number) => {
    if (!editing || !drag.current) return;
    e.stopPropagation();
    const moved = drag.current.moved;
    drag.current = null;
    if (moved) return;
    if (sel === null) { setSel(id); return; }
    if (sel === id) { setSel(null); return; }
    const idx = graph.edges.findIndex(([u, v]) => same([u, v], sel, id));
    if (idx >= 0) set({ ...graph, edges: graph.edges.filter((_, i) => i !== idx) });
    else set({ ...graph, edges: [...graph.edges, [sel, id, 1 + Math.floor(Math.random() * 9)]] });
    setSel(null);
  };
  const bumpWeight = (e: React.MouseEvent, idx: number, delta: number) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    set({ ...graph, edges: graph.edges.map((ed, i) => (i === idx ? [ed[0], ed[1], ((ed[2] - 1 + delta + 9) % 9) + 1] : ed)) });
  };

  const visited = new Set(s?.visited ?? []);
  const frontier = new Set(s?.frontier ?? []);
  const done = new Set(s?.done ?? []);

  return (
    <div className="graph-view">
      <svg
        ref={svgRef}
        viewBox="0 0 640 360"
        className={`graph-svg ${editing ? 'editing' : ''}`}
        role="img"
        aria-label="Graph"
        onClick={onBgClick}
        onPointerMove={onMove}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="arrow-head" />
          </marker>
        </defs>
        {graph.edges.map(([u, v, w], idx) => {
          const a = graph.nodes[u];
          const b = graph.nodes[v];
          if (!a || !b) return null;
          const tree = s?.treeEdges.some((e) => same(e, u, v));
          const active = same(s?.activeEdge, u, v);
          const rejected = s?.rejectedEdges?.some((e) => same(e, u, v));
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const x2 = directed ? b.x - ((b.x - a.x) / len) * (R + 3) : b.x;
          const y2 = directed ? b.y - ((b.y - a.y) / len) * (R + 3) : b.y;
          return (
            <g key={`${u}-${v}-${idx}`}>
              <line x1={a.x} y1={a.y} x2={x2} y2={y2} markerEnd={directed ? 'url(#arrow)' : undefined}
                className={`edge ${tree ? 'tree' : ''} ${active ? 'active' : ''} ${rejected ? 'rejected' : ''}`} />
              {weighted && (
                <text
                  x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6}
                  className={`edge-w ${editing ? 'clickable' : ''}`}
                  onClick={(e) => bumpWeight(e, idx, 1)}
                  onContextMenu={(e) => bumpWeight(e, idx, -1)}
                >
                  {w}
                </text>
              )}
            </g>
          );
        })}
        {graph.nodes.map((p, i) => {
          const cls = editing
            ? sel === i ? 'cur' : ''
            : s?.current === i ? 'cur' : done.has(i) ? 'done' : frontier.has(i) ? 'front' : visited.has(i) ? 'seen' : '';
          const d = s?.dist?.[i];
          return (
            <g key={i} className={`gnode ${cls} ${editing ? 'draggable' : ''}`}
              onPointerDown={(e) => onNodeDown(e, i)} onPointerUp={(e) => onNodeUp(e, i)}
              onClick={(e) => editing && e.stopPropagation()}>
              <circle cx={p.x} cy={p.y} r={R} />
              <text x={p.x} y={p.y + 5} className="gnode-label">{i}</text>
              {!editing && s?.dist && (
                <text x={p.x} y={p.y - 30} className="dist">{d === null || d === undefined ? '∞' : d}</text>
              )}
            </g>
          );
        })}
      </svg>
      {editing ? (
        <div className="edit-help">
          <span>Click empty space: add node (max 12)</span>
          <span>Click two nodes: add / remove edge</span>
          <span>Drag: move</span>
          {weighted && <span>Click weight: +1 · right-click: −1</span>}
          {sel !== null && <button className="small danger" onClick={() => removeNode(sel)}>Delete node {sel}</button>}
        </div>
      ) : s && (
        <>
          <div className="legend">
            <span><i className="sw cur" />current</span>
            <span><i className="sw front" />in {s.frontierLabel.split(' ')[0]}</span>
            <span><i className="sw done" />{s.dist ? 'finalized' : 'finished'}</span>
            <span><i className="sw seen" />discovered</span>
          </div>
          <div className="aux">
            <span className="muted">{s.frontierLabel}:</span>
            {s.frontierItems.length ? s.frontierItems.map((t, i) => (
              <span key={i} className={`chip ${t.endsWith('✓') ? 'ok' : t.endsWith('✗') ? 'bad' : ''}`}>{t}</span>
            )) : <span className="muted">empty</span>}
          </div>
          {s.info?.map((row) => (
            <div key={row.label} className="aux">
              <span className="muted">{row.label}:</span>
              {row.items.map((t, i) => <span key={i} className="chip">{t}</span>)}
            </div>
          ))}
          {(s.order.length > 0 || !s.info) && <div className="aux">
            <span className="muted">order:</span>
            {s.order.length ? s.order.map((t, i) => <span key={i} className="chip ok">{t}</span>) : <span className="muted">—</span>}
          </div>}
        </>
      )}
    </div>
  );
}
