import { CallTracker, parseCpp, Recorder } from '../core/cpp';
import type { Algo, Graph, GraphInput, GraphState, Vars } from '../core/types';
import bfsSrc from '../cpp/bfs.cpp?raw';
import dfsSrc from '../cpp/dfs.cpp?raw';
import dijkstraSrc from '../cpp/dijkstra.cpp?raw';
import topoSrc from '../cpp/topo.cpp?raw';
import kruskalSrc from '../cpp/kruskal.cpp?raw';

/** Sample graph in a 640×360 viewBox. Every edge goes low id → high id, so it is also a DAG. */
export const SAMPLE_GRAPH: Graph = {
  nodes: [
    { x: 60, y: 180 }, { x: 180, y: 70 }, { x: 180, y: 290 }, { x: 320, y: 130 },
    { x: 320, y: 290 }, { x: 460, y: 70 }, { x: 460, y: 250 }, { x: 580, y: 160 },
  ],
  edges: [
    [0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5], [2, 3, 8], [2, 4, 9],
    [3, 4, 2], [3, 5, 6], [4, 6, 3], [5, 6, 1], [5, 7, 2], [6, 7, 7],
  ],
};

/** Random connected graph: a random spanning tree plus a few extra edges, oriented low → high id. */
export function randomGraph(n = 8): Graph {
  const cols = Math.ceil(n / 2);
  const nodes = Array.from({ length: n }, (_, i) => ({
    x: 60 + (i % cols) * (520 / Math.max(1, cols - 1)) + (Math.random() * 40 - 20),
    y: (i < cols ? 90 : 270) + (Math.random() * 50 - 25),
  }));
  const key = (u: number, v: number) => `${Math.min(u, v)}-${Math.max(u, v)}`;
  const seen = new Set<string>();
  const edges: [number, number, number][] = [];
  const add = (u: number, v: number) => {
    if (u === v || seen.has(key(u, v))) return;
    seen.add(key(u, v));
    edges.push([Math.min(u, v), Math.max(u, v), 1 + Math.floor(Math.random() * 9)]);
  };
  for (let i = 1; i < n; i++) add(i, Math.floor(Math.random() * i));
  for (let t = 0; t < Math.floor(n / 2); t++) add(Math.floor(Math.random() * n), Math.floor(Math.random() * n));
  return { nodes, edges };
}

export function adjacency(g: Graph, directed: boolean) {
  const adj: [number, number][][] = g.nodes.map(() => []);
  for (const [u, v, w] of g.edges) {
    adj[u].push([v, w]);
    if (!directed) adj[v].push([u, w]);
  }
  adj.forEach((l) => l.sort((p, q) => p[0] - q[0]));
  return adj;
}

const blank = (): GraphState => ({
  current: null, visited: [], frontier: [], frontierLabel: '', frontierItems: [],
  activeEdge: null, treeEdges: [], order: [], done: [], vars: {},
});

function bfs({ graph, src }: GraphInput) {
  const p = parseCpp(bfsSrc);
  const r = new Recorder<GraphState>(p.labels);
  const adj = adjacency(graph, false);
  const s = blank();
  s.frontierLabel = 'queue (front → back)';
  const visited = new Set<number>();
  const level = new Map<number, number>([[src, 0]]);
  const q: number[] = [];
  const snap = (label: string, msg: string, vars: Vars = {}) => {
    s.visited = [...visited];
    s.frontier = [...q];
    s.frontierItems = q.map(String);
    s.vars = vars;
    r.add(label, msg, s);
  };
  visited.add(src);
  q.push(src);
  snap('init', `Mark ${src} visited and push it`, { src });
  while (q.length) {
    const u = q.shift()!;
    s.current = u;
    s.activeEdge = null;
    s.order.push(u);
    s.done.push(u);
    snap('pop', `Pop ${u} from the front of the queue`, { u });
    for (const [v] of adj[u]) {
      s.activeEdge = [u, v];
      snap('check', `Neighbour ${v}: ${visited.has(v) ? 'already visited, skip' : 'not visited yet'}`, { u, v });
      if (!visited.has(v)) {
        visited.add(v);
        level.set(v, level.get(u)! + 1);
        q.push(v);
        s.treeEdges.push([u, v]);
        snap('visit', `Mark ${v} visited and push it (distance ${level.get(v)} from ${src})`, { u, v });
      }
    }
  }
  s.current = null;
  s.activeEdge = null;
  const missed = graph.nodes.length - s.order.length;
  snap('done', `BFS order: ${s.order.join(' → ')}${missed ? ` (${missed} node${missed > 1 ? 's' : ''} unreachable)` : ''}`);
  return r.frames;
}

function dfs({ graph, src }: GraphInput) {
  const p = parseCpp(dfsSrc);
  const r = new Recorder<GraphState>(p.labels);
  const adj = adjacency(graph, false);
  const ct = new CallTracker();
  const s = blank();
  s.frontierLabel = 'call stack (bottom → top)';
  const visited = new Set<number>();
  const stack: number[] = [];
  const snap = (label: string, msg: string, vars: Vars = {}) => {
    s.visited = [...visited];
    s.frontier = [...stack];
    s.frontierItems = stack.map((x) => `dfs(${x})`);
    s.vars = vars;
    r.add(label, msg, { ...s, ...ct.snapshot() });
  };
  const go = (u: number) => {
    ct.enter(`dfs(${u})`);
    stack.push(u);
    visited.add(u);
    s.current = u;
    s.activeEdge = null;
    s.order.push(u);
    snap('visit', `Enter dfs(${u}): mark visited`, { u });
    for (const [v] of adj[u]) {
      s.current = u;
      s.activeEdge = [u, v];
      snap('check', `Neighbour ${v}: ${visited.has(v) ? 'already visited, skip' : 'unvisited → go deeper'}`, { u, v });
      if (!visited.has(v)) {
        s.treeEdges.push([u, v]);
        snap('recurse', `Recurse into dfs(${v})`, { u, v });
        go(v);
      }
    }
    s.done.push(u);
    s.activeEdge = null;
    snap('back', `All neighbours of ${u} done → return${stack.length > 1 ? ` to dfs(${stack[stack.length - 2]})` : ''}`, { u });
    stack.pop();
    ct.exit();
    s.current = stack.length ? stack[stack.length - 1] : null;
  };
  go(src);
  return r.frames;
}

function dijkstra({ graph, src }: GraphInput) {
  const p = parseCpp(dijkstraSrc);
  const r = new Recorder<GraphState>(p.labels);
  const adj = adjacency(graph, false);
  const s = blank();
  s.frontierLabel = 'min-heap {dist, node}';
  const dist: number[] = graph.nodes.map(() => Infinity);
  const parent: number[] = graph.nodes.map(() => -1);
  const pq: [number, number][] = [];
  const snap = (label: string, msg: string, vars: Vars = {}) => {
    pq.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    s.dist = dist.map((d) => (d === Infinity ? null : d));
    s.frontier = pq.map(([, u]) => u);
    s.frontierItems = pq.map(([d, u]) => `{${d}, ${u}}`);
    s.visited = dist.map((d, i) => (d < Infinity ? i : -1)).filter((i) => i >= 0);
    s.treeEdges = parent.map((pu, v) => [pu, v] as [number, number]).filter(([pu]) => pu >= 0);
    s.vars = vars;
    r.add(label, msg, s);
  };
  dist[src] = 0;
  pq.push([0, src]);
  snap('init', `dist[${src}] = 0, everything else = ∞. Push {0, ${src}}`, { src });
  while (pq.length) {
    pq.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const [d, u] = pq.shift()!;
    s.current = u;
    s.activeEdge = null;
    snap('pop', `Pop the smallest: {${d}, ${u}}`, { d, u });
    if (d > dist[u]) {
      snap('stale', `Stale entry: ${d} > dist[${u}]=${dist[u]} → skip`, { d, u });
      continue;
    }
    s.done.push(u);
    s.order.push(u);
    for (const [v, w] of adj[u]) {
      s.activeEdge = [u, v];
      const cand = dist[u] + w;
      const old = dist[v] === Infinity ? '∞' : dist[v];
      snap('relax', `Edge ${u}→${v} (w=${w}): is ${dist[u]} + ${w} = ${cand} < dist[${v}]=${old}?`, { u, v, w });
      if (cand < dist[v]) {
        dist[v] = cand;
        parent[v] = u;
        pq.push([cand, v]);
        snap('update', `Yes → dist[${v}] = ${cand}, push {${cand}, ${v}}`, { u, v, w });
      }
    }
  }
  s.current = null;
  s.activeEdge = null;
  snap('done', `Shortest distances from ${src}: ${dist.map((d, i) => `${i}:${d === Infinity ? '∞' : d}`).join('  ')}`);
  return r.frames;
}

function topo({ graph }: GraphInput) {
  const p = parseCpp(topoSrc);
  const r = new Recorder<GraphState>(p.labels);
  const n = graph.nodes.length;
  const adj = adjacency(graph, true);
  const s = blank();
  s.frontierLabel = 'queue (indegree 0)';
  const indeg = Array(n).fill(0);
  const q: number[] = [];
  const snap = (label: string, msg: string, vars: Vars = {}) => {
    s.frontier = [...q];
    s.frontierItems = q.map(String);
    s.info = [{ label: 'indeg', items: indeg.map((d, i) => `${i}:${d}`) }];
    s.vars = vars;
    r.add(label, msg, s);
  };
  for (let u = 0; u < n; u++) for (const [v] of adj[u]) {
    indeg[v]++;
    s.activeEdge = [u, v];
    snap('indeg', `Edge ${u} → ${v}: indeg[${v}] = ${indeg[v]}`, { u, v });
  }
  s.activeEdge = null;
  for (let u = 0; u < n; u++) if (indeg[u] === 0) {
    q.push(u);
    s.visited.push(u);
    snap('seed', `indeg[${u}] = 0 → nothing must come before it, push ${u}`, { u });
  }
  while (q.length) {
    const u = q.shift()!;
    s.current = u;
    s.order.push(u);
    s.done.push(u);
    snap('pop', `Pop ${u} → next in topological order`, { u });
    for (const [v] of adj[u]) {
      indeg[v]--;
      s.activeEdge = [u, v];
      s.treeEdges.push([u, v]);
      if (indeg[v] === 0) { q.push(v); s.visited.push(v); }
      snap('dec', `Remove edge ${u} → ${v}: indeg[${v}] = ${indeg[v]}${indeg[v] === 0 ? ` → push ${v}` : ''}`, { u, v });
    }
    s.activeEdge = null;
  }
  s.current = null;
  if (s.order.length < n) {
    snap('cycle', `Only ${s.order.length} of ${n} nodes came out → the graph has a cycle, no topological order exists`);
  } else {
    snap('done', `Topological order: ${s.order.join(' → ')}`);
  }
  return r.frames;
}

function kruskal({ graph }: GraphInput) {
  const p = parseCpp(kruskalSrc);
  const r = new Recorder<GraphState>(p.labels);
  const n = graph.nodes.length;
  const s = blank();
  s.frontierLabel = 'edges by weight';
  s.rejectedEdges = [];
  const par = Array.from({ length: n }, (_, i) => i);
  const sorted = [...graph.edges].map((e, i) => ({ e, i })).sort((a, b) => a.e[2] - b.e[2] || a.i - b.i).map((x) => x.e);
  const status: ('' | '✓' | '✗')[] = sorted.map(() => '');
  let total = 0;
  const snap = (label: string, msg: string, vars: Vars = {}) => {
    s.frontierItems = sorted.map(([u, v, w], k) => `${u}-${v} (${w})${status[k] ? ' ' + status[k] : ''}`);
    s.info = [{ label: 'parent', items: par.map((x, i) => `${i}→${x}`) }];
    s.vars = { total, ...vars };
    r.add(label, msg, s);
  };
  const find = (x: number) => {
    while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; }
    return x;
  };
  snap('sort', `Sort the ${sorted.length} edges by weight`);
  snap('init', `Every node starts as its own set: p[i] = i`);
  sorted.forEach(([u, v, w], k) => {
    s.activeEdge = [u, v];
    const ru = find(u);
    const rv = find(v);
    snap('roots', `Edge ${u}-${v} (w=${w}): find(${u}) = ${ru}, find(${v}) = ${rv}`, { u, v, w, ru, rv });
    if (ru === rv) {
      status[k] = '✗';
      s.rejectedEdges!.push([u, v]);
      snap('skip', `Same set → adding ${u}-${v} would make a cycle, skip`, { u, v, w });
      return;
    }
    par[ru] = rv;
    total += w;
    status[k] = '✓';
    s.treeEdges.push([u, v]);
    s.done = [...new Set([...s.done, u, v])];
    snap('union', `Different sets → take it. p[${ru}] = ${rv}, total = ${total}`, { u, v, w });
  });
  s.activeEdge = null;
  const comps = new Set(par.map((_, i) => find(i))).size;
  snap('done', `MST weight = ${total} using ${s.treeEdges.length} edges${comps > 1 ? ` (graph is disconnected: ${comps} components → spanning forest)` : ''}`);
  return r.frames;
}

export const graphAlgos: Algo[] = [
  { kind: 'graph', id: 'bfs', name: 'BFS', weighted: false, code: parseCpp(bfsSrc).code, time: 'O(V + E)', space: 'O(V)', note: 'Explores level by level; gives shortest paths in unweighted graphs. Weights are ignored.', run: bfs },
  { kind: 'graph', id: 'dfs', name: 'DFS', weighted: false, recursive: true, code: parseCpp(dfsSrc).code, time: 'O(V + E)', space: 'O(V) recursion', note: 'Goes as deep as possible before backtracking. Weights are ignored.', run: dfs },
  { kind: 'graph', id: 'dijkstra', name: 'Dijkstra', weighted: true, code: parseCpp(dijkstraSrc).code, time: 'O((V + E) log V)', space: 'O(V + E)', note: 'Lazy-deletion version: stale heap entries are skipped. Needs non-negative weights.', run: dijkstra },
  { kind: 'graph', id: 'topo', name: 'Topological sort', weighted: false, directed: true, code: parseCpp(topoSrc).code, time: 'O(V + E)', space: 'O(V)', note: "Kahn's algorithm. Edges are directed here; add a back-edge in the editor to see cycle detection.", run: topo },
  { kind: 'graph', id: 'kruskal', name: 'Kruskal + union-find', weighted: true, code: parseCpp(kruskalSrc).code, time: 'O(E log E)', space: 'O(V)', note: 'Greedy MST: take the cheapest edge that joins two different sets. find() uses path halving.', run: kruskal },
];
