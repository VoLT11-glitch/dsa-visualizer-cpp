import { parseCpp, Recorder } from '../core/cpp';
import type { Algo, GraphState, Vars } from '../core/types';
import bfsSrc from '../cpp/bfs.cpp?raw';
import dfsSrc from '../cpp/dfs.cpp?raw';
import dijkstraSrc from '../cpp/dijkstra.cpp?raw';

/** The sample graph: undirected, weighted. Positions are in a 640×360 viewBox. */
export const NODES: { x: number; y: number }[] = [
  { x: 60, y: 180 },
  { x: 180, y: 70 },
  { x: 180, y: 290 },
  { x: 320, y: 130 },
  { x: 320, y: 290 },
  { x: 460, y: 70 },
  { x: 460, y: 250 },
  { x: 580, y: 160 },
];
export const EDGES: [number, number, number][] = [
  [0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5], [2, 3, 8], [2, 4, 9],
  [3, 4, 2], [3, 5, 6], [4, 6, 3], [5, 6, 1], [5, 7, 2], [6, 7, 7],
];

const adj: [number, number][][] = NODES.map(() => []);
for (const [u, v, w] of EDGES) {
  adj[u].push([v, w]);
  adj[v].push([u, w]);
}
adj.forEach((l) => l.sort((p, q) => p[0] - q[0]));

const blank = (): GraphState => ({
  current: null, visited: [], frontier: [], frontierLabel: '', frontierItems: [],
  activeEdge: null, treeEdges: [], order: [], done: [], vars: {},
});

function bfs(src: number) {
  const p = parseCpp(bfsSrc);
  const r = new Recorder<GraphState>(p.labels);
  const s = blank();
  s.frontierLabel = 'queue (front → back)';
  const visited = new Set<number>();
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
        q.push(v);
        s.treeEdges.push([u, v]);
        snap('visit', `Mark ${v} visited and push it (distance ${levelOf(s.treeEdges, src, v)} from ${src})`, { u, v });
      }
    }
  }
  s.current = null;
  s.activeEdge = null;
  snap('done', `BFS order: ${s.order.join(' → ')}`);
  return r.frames;
}

function levelOf(tree: [number, number][], src: number, v: number) {
  let d = 0;
  let cur = v;
  while (cur !== src) {
    const e = tree.find(([, b]) => b === cur);
    if (!e) break;
    cur = e[0];
    d++;
  }
  return d;
}

function dfs(src: number) {
  const p = parseCpp(dfsSrc);
  const r = new Recorder<GraphState>(p.labels);
  const s = blank();
  s.frontierLabel = 'call stack (bottom → top)';
  const visited = new Set<number>();
  const stack: number[] = [];
  const snap = (label: string, msg: string, vars: Vars = {}) => {
    s.visited = [...visited];
    s.frontier = [...stack];
    s.frontierItems = stack.map((x) => `dfs(${x})`);
    s.vars = vars;
    r.add(label, msg, s);
  };
  const go = (u: number) => {
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
    s.current = stack.length ? stack[stack.length - 1] : null;
  };
  go(src);
  return r.frames;
}

function dijkstra(src: number) {
  const p = parseCpp(dijkstraSrc);
  const r = new Recorder<GraphState>(p.labels);
  const s = blank();
  s.frontierLabel = 'min-heap {dist, node}';
  const dist: number[] = NODES.map(() => Infinity);
  const parent: number[] = NODES.map(() => -1);
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
  snap('done', `Shortest distances from ${src}: ${dist.map((d, i) => `${i}:${d}`).join('  ')}`);
  return r.frames;
}

export const graphAlgos: Algo[] = [
  { kind: 'graph', id: 'bfs', name: 'BFS', weighted: false, code: parseCpp(bfsSrc).code, time: 'O(V + E)', space: 'O(V)', note: 'Explores level by level; gives shortest paths in unweighted graphs. Weights are ignored.', run: bfs },
  { kind: 'graph', id: 'dfs', name: 'DFS', weighted: false, code: parseCpp(dfsSrc).code, time: 'O(V + E)', space: 'O(V) recursion', note: 'Goes as deep as possible before backtracking. Weights are ignored.', run: dfs },
  { kind: 'graph', id: 'dijkstra', name: 'Dijkstra', weighted: true, code: parseCpp(dijkstraSrc).code, time: 'O((V + E) log V)', space: 'O(V + E)', note: 'Lazy-deletion version: stale heap entries are skipped. Needs non-negative weights.', run: dijkstra },
];
