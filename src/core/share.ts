import type { Graph, KnapInput, StrInput } from './types';

export interface Inputs {
  arr: number[];
  target: number;
  k: number;
  src: number;
  graph: Graph;
  str: StrInput;
  knap: KnapInput;
  tree: number[];
}

const ints = (s: string | null) => (s ? s.split(',').map(Number).filter((x) => Number.isFinite(x)) : null);

export function encodeGraph(g: Graph) {
  const n = g.nodes.map((p) => `${Math.round(p.x)}.${Math.round(p.y)}`).join('_');
  const e = g.edges.map(([u, v, w]) => `${u}.${v}.${w}`).join('_');
  return `${n}~${e}`;
}

export function decodeGraph(s: string | null): Graph | null {
  if (!s) return null;
  const [ns, es = ''] = s.split('~');
  const nodes = ns.split('_').filter(Boolean).map((t) => {
    const [x, y] = t.split('.').map(Number);
    return { x, y };
  });
  if (!nodes.length || nodes.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const edges = es.split('_').filter(Boolean).map((t) => t.split('.').map(Number) as [number, number, number])
    .filter(([u, v, w]) => u >= 0 && v >= 0 && u < nodes.length && v < nodes.length && u !== v && Number.isFinite(w));
  return { nodes: nodes.slice(0, 12), edges };
}

/** Only the params that matter for the chosen kind go in the link, so URLs stay short. */
export function toParams(kind: string, inp: Inputs, step: number) {
  const p = new URLSearchParams();
  if (kind === 'sort' || kind === 'search' || kind === 'window' || kind === 'lis') p.set('a', inp.arr.join(','));
  if (kind === 'search') p.set('t', String(inp.target));
  if (kind === 'window') p.set('k', String(inp.k));
  if (kind === 'graph') { p.set('src', String(inp.src)); p.set('g', encodeGraph(inp.graph)); }
  if (kind === 'twoStr') { p.set('sa', inp.str.a); p.set('sb', inp.str.b); }
  if (kind === 'knap') { p.set('kw', inp.knap.wt.join(',')); p.set('kv', inp.knap.val.join(',')); p.set('kc', String(inp.knap.W)); }
  if (kind === 'tree') p.set('tr', inp.tree.join(','));
  if (step > 0) p.set('s', String(step));
  return p;
}

export function fromParams(p: URLSearchParams, base: Inputs): { inp: Inputs; step: number } {
  const inp = { ...base };
  const a = ints(p.get('a'));
  if (a && a.length >= 2) inp.arr = a.slice(0, 40);
  if (p.has('t') && Number.isFinite(Number(p.get('t')))) inp.target = Number(p.get('t'));
  if (p.has('k') && Number(p.get('k')) >= 1) inp.k = Number(p.get('k'));
  const g = decodeGraph(p.get('g'));
  if (g) inp.graph = g;
  if (p.has('src')) inp.src = Math.max(0, Math.min(inp.graph.nodes.length - 1, Number(p.get('src')) || 0));
  if (p.has('sa') || p.has('sb')) inp.str = { a: (p.get('sa') ?? '').slice(0, 12), b: (p.get('sb') ?? '').slice(0, 12) };
  const kw = ints(p.get('kw')), kv = ints(p.get('kv'));
  if (kw && kv && kw.length === kv.length && kw.length <= 6) inp.knap = { wt: kw, val: kv, W: Math.min(15, Math.max(1, Number(p.get('kc')) || 7)) };
  const tr = ints(p.get('tr'));
  if (tr && tr.length) inp.tree = tr.slice(0, 15);
  return { inp, step: Math.max(0, Number(p.get('s')) || 0) };
}
