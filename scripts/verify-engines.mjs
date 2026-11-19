// Runs every algorithm engine headlessly and checks the final frames are correct.
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p) => server.ssrLoadModule(p);
const { ALL_ALGOS } = await load('/src/algorithms/registry.ts');
const { LAB_ALGOS, measure } = await load('/src/lab/counters.ts');
const { fitModels } = await load('/src/lab/fit.ts');
const { parseTrace, Replay } = await load('/src/replay/trace.ts');
const fs = await import('node:fs');
const { SAMPLE_GRAPH, randomGraph } = await load('/src/algorithms/graph.ts');
const { toParams, fromParams } = await load('/src/core/share.ts');
const ONLINE = process.argv.includes('--online');
function primMST(g) {
  const n = g.nodes.length, inT = Array(n).fill(false), d = Array(n).fill(Infinity);
  let total = 0;
  for (let s = 0; s < n; s++) {
    if (inT[s]) continue;
    d[s] = 0;
    while (true) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!inT[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
      if (u < 0) break;
      inT[u] = true; total += d[u];
      for (const [a, b, w] of g.edges) { const v = a === u ? b : b === u ? a : -1; if (v >= 0 && !inT[v] && w < d[v]) d[v] = w; }
    }
  }
  return total;
}
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log('FAIL', msg); } };

for (const a of ALL_ALGOS) {
  if (a.kind === 'sort') {
    for (let t = 0; t < 200; t++) {
      const n = 2 + Math.floor(Math.random() * 30);
      const arr = Array.from({ length: n }, () => Math.floor(Math.random() * 20) - 5);
      const fr = a.run(arr);
      const last = fr[fr.length - 1].state.arr;
      const exp = [...arr].sort((x, y) => x - y);
      check(JSON.stringify(last) === JSON.stringify(exp), `${a.id} on ${arr}`);
      check(fr.every((f) => f.line >= 1 && f.line <= a.code.length), `${a.id} line range`);
    }
    if (a.recursive) { const st = a.run([5,3,8,1,9,2,7,4,6,0]).at(-1).state; check(st.calls.length > 5 && st.calls.every((c) => c.done), `${a.id} recursion tree complete`); }
    console.log(`ok ${a.id} (frames for n=10: ${a.run([5,3,8,1,9,2,7,4,6,0]).length})`);
  } else if (a.kind === 'graph') {
    if (['bfs', 'dfs', 'dijkstra'].includes(a.id)) for (let s = 0; s < 8; s++) {
      const fr = a.run({ graph: SAMPLE_GRAPH, src: s });
      const st = fr[fr.length - 1].state;
      check(new Set(st.order).size === 8, `${a.id} src ${s} reaches all`);
      check(st.order[0] === s, `${a.id} starts at src`);
    }
    if (a.id === 'dfs') { const st = a.run({ graph: SAMPLE_GRAPH, src: 0 }).at(-1).state; check(st.calls.length === 8 && st.calls.filter((c) => !c.done).length === 1, 'dfs recursion tree: 8 calls, only the root still returning'); }
    if (a.id === 'topo') {
      const ord = a.run({ graph: SAMPLE_GRAPH, src: 0 }).at(-1).state.order;
      const pos = new Map(ord.map((u, i) => [u, i]));
      check(ord.length === 8 && SAMPLE_GRAPH.edges.every(([u, v]) => pos.get(u) < pos.get(v)), 'topo order valid');
      const cyc = a.run({ graph: { ...SAMPLE_GRAPH, edges: [...SAMPLE_GRAPH.edges, [7, 0, 1]] }, src: 0 }).at(-1);
      check(/cycle/.test(cyc.msg), 'topo detects cycle');
    }
    if (a.id === 'kruskal') for (let t = 0; t < 50; t++) {
      const g = t ? randomGraph(5 + (t % 6)) : SAMPLE_GRAPH;
      const total = a.run({ graph: g, src: 0 }).at(-1).state.vars.total;
      check(total === primMST(g), `kruskal MST weight ${total} vs prim ${primMST(g)}`);
    }
    console.log(`ok ${a.id}: ${a.run({ graph: SAMPLE_GRAPH, src: 0 }).at(-1).msg}`);
  } else if (a.kind === 'search') {
    for (let t = 0; t < 300; t++) {
      const arr = Array.from({ length: 2 + Math.floor(Math.random() * 25) }, () => Math.floor(Math.random() * 50));
      const target = Math.floor(Math.random() * 60);
      const last = a.run({ arr, target }).at(-1);
      const sorted = [...arr].sort((x, y) => x - y);
      if (a.id === 'binary-search') check(/found/.test(last.msg) === sorted.includes(target), `bsearch ${target} in ${sorted}`);
      else {
        let any = false;
        for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) if (sorted[i] + sorted[j] === target) any = true;
        check(/found/.test(last.msg) === any, `two pointers ${target} in ${sorted}`);
      }
    }
    console.log(`ok ${a.id}`);
  } else if (a.kind === 'window') {
    for (let t = 0; t < 200; t++) {
      const arr = Array.from({ length: 3 + Math.floor(Math.random() * 20) }, () => Math.floor(Math.random() * 40) - 10);
      const k = 1 + Math.floor(Math.random() * arr.length);
      let best = -Infinity;
      for (let i = 0; i + k <= arr.length; i++) best = Math.max(best, arr.slice(i, i + k).reduce((x, y) => x + y, 0));
      check(a.run({ arr, k }).at(-1).state.vars.best === best, `window k=${k} ${arr}`);
    }
    console.log(`ok ${a.id}`);
  } else if (a.kind === 'lis') {
    for (let t = 0; t < 200; t++) {
      const arr = Array.from({ length: 2 + Math.floor(Math.random() * 14) }, () => Math.floor(Math.random() * 30));
      const dp = arr.map(() => 1);
      for (let i = 0; i < arr.length; i++) for (let j = 0; j < i; j++) if (arr[j] < arr[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
      const fr = a.run(arr).at(-1);
      check(fr.state.vars.answer === Math.max(...dp), `lis ${arr}`);
      const seq = fr.state.result.split(', ').map(Number);
      check(seq.length === Math.max(...dp) && seq.every((x, i) => i === 0 || seq[i - 1] < x), `lis witness ${seq}`);
    }
    console.log(`ok lis`);
  } else if (a.id === 'edit-distance') {
    const fr = a.run({ a: 'kitten', b: 'sitting' });
    check(fr.at(-1).state.vars.answer === 3, 'kitten→sitting = 3');
    check(a.run({ a: '', b: 'abc' }).at(-1).state.vars.answer === 3, 'empty→abc = 3');
    console.log(`ok edit distance: ${fr.at(-1).msg}`);
  } else if (a.kind === 'twoStr') {
    const fr = a.run({ a: 'ABCBDAB', b: 'BDCABA' });
    check(fr.at(-1).state.vars.answer === 4, 'lcs = 4');
    console.log(`ok lcs: ${fr.at(-1).msg}`);
  } else if (a.kind === 'knap') {
    const fr = a.run({ wt: [1, 3, 4, 5], val: [1, 4, 5, 7], W: 7 });
    check(fr.at(-1).state.vars.answer === 9, 'knapsack = 9');
    console.log(`ok knapsack: ${fr.at(-1).msg}`);
  } else if (a.kind === 'tree') {
    const fr = a.run([50, 30, 70, 20, 40, 60, 80, 35, 65]);
    console.log(`ok ${a.id}: ${fr.at(-1).msg}`);
    if (a.id === 'inorder') check(fr.at(-1).state.output.join() === '20,30,35,40,50,60,65,70,80', 'inorder sorted');
    if (a.id === 'preorder') check(fr.at(-1).state.output.join() === '50,30,20,40,35,70,60,65,80', 'preorder');
    if (a.id === 'postorder') check(fr.at(-1).state.output.join() === '20,35,40,30,65,60,80,70,50', 'postorder');
    if (a.recursive) check(fr.at(-1).state.calls.length === 9 && fr.at(-1).state.calls.every((c) => c.done), `${a.id} recursion tree`);
  }
}

const sizes = [10, 25, 50, 100, 250, 500, 1000, 2000, 4000];
for (const shape of ['random', 'sorted', 'reversed']) {
  const line = [];
  for (const a of LAB_ALGOS) {
    const pts = sizes.map((n) => { const r = measure(a.fn, n, shape, 1); check(r.ok, `lab ${a.id} sorted ${shape}`); return { n, y: r.cmp + r.mv }; });
    const f = fitModels(pts);
    line.push(`${a.id}=${f.fits[0].name}(${f.slope.toFixed(2)})`);
  }
  console.log(`lab ${shape}: ${line.join('  ')}`);
}

const tr = parseTrace(fs.readFileSync('cpp/examples/trace.json', 'utf8'));
for (const v of tr.vectors) {
  const r = new Replay(tr, v.id);
  const end = r.frame(r.count - 1).state.arr;
  check(end.every((x, i) => i === 0 || end[i - 1] <= x), `replay ${v.name} ends sorted`);
  console.log(`ok replay ${v.name}: ${r.count - 1} ops → [${end}]`, r.frame(r.count - 1).state.vars);
}
// Shareable links round-trip.
{
  const base = { arr: [1, 2], target: 0, k: 1, src: 0, graph: SAMPLE_GRAPH, str: { a: 'x', b: 'y' }, knap: { wt: [1], val: [1], W: 1 }, tree: [1] };
  const g = randomGraph(7);
  const inp = { ...base, arr: [9, 4, 7], target: 7, k: 2, src: 3, graph: g, str: { a: 'HELLO', b: 'YELLOW' }, knap: { wt: [2, 3], val: [4, 5], W: 5 }, tree: [5, 3, 8] };
  for (const kind of ['sort', 'search', 'window', 'graph', 'twoStr', 'knap', 'tree']) {
    const back = fromParams(new URLSearchParams(toParams(kind, inp, 12).toString()), base);
    check(back.step === 12, `share step ${kind}`);
    if (kind === 'graph') check(back.inp.graph.edges.length === g.edges.length && back.inp.src === 3, 'share graph');
    if (kind === 'search') check(back.inp.arr.join() === '9,4,7' && back.inp.target === 7, 'share search');
    if (kind === 'twoStr') check(back.inp.str.b === 'YELLOW', 'share strings');
    if (kind === 'knap') check(back.inp.knap.W === 5 && back.inp.knap.val.join() === '4,5', 'share knap');
  }
  console.log('ok share links');
}

if (ONLINE) {
  const { buildHarness, parseTimings, PRESETS } = await load('/src/lab/harness.ts');
  const { buildTraceProgram } = await load('/src/replay/program.ts');
  const run = async (src, flags) => {
    const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=true&wait=true', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_code: Buffer.from(src).toString('base64'), language_id: 105, compiler_options: flags, cpu_time_limit: 10, wall_time_limit: 22 }),
    });
    const j = await res.json();
    const d = (x) => (x ? Buffer.from(x, 'base64').toString() : '');
    return { status: j.status?.description, stdout: d(j.stdout), stderr: d(j.stderr), compile: d(j.compile_output) };
  };
  const [ra, rb] = await Promise.all([PRESETS[0].a, PRESETS[0].b].map((c) => run(buildHarness(c, 'random', 64, 1 << 18, 6), '-O2 -std=c++20')));
  const fa = fitModels(parseTimings(ra.stdout).map((p) => ({ n: p.n, y: p.t })));
  const fb = fitModels(parseTimings(rb.stdout).map((p) => ({ n: p.n, y: p.t })));
  console.log(`judge0 bubble: ${ra.status}, ${parseTimings(ra.stdout).length} pts → ${fa.fits[0].name} (slope ${fa.slope.toFixed(2)})`);
  console.log(`judge0 std::sort: ${rb.status}, ${parseTimings(rb.stdout).length} pts → ${fb.fits[0].name} (slope ${fb.slope.toFixed(2)})`);
  check(fa.fits[0].name === 'O(n²)', 'judge0 bubble is quadratic');
  check(fb.fits[0].name !== 'O(n²)', 'judge0 std::sort is not quadratic');
  const tr = await run(buildTraceProgram(fs.readFileSync('cpp/examples/insertion_trace.cpp', 'utf8')), '-O0 -std=c++20');
  const t = parseTrace(tr.stderr.slice(tr.stderr.indexOf('{"version"')));
  const local = parseTrace(fs.readFileSync('cpp/examples/trace.json', 'utf8'));
  check(JSON.stringify(t.ops) === JSON.stringify(local.ops), 'online trace matches local trace (same ops + line numbers)');
  console.log(`judge0 trace: ${tr.status}, ${t.ops.length} ops, matches local: ${JSON.stringify(t.ops) === JSON.stringify(local.ops)}`);
}

await server.close();
console.log(fail ? `${fail} FAILURES` : 'ALL OK');
process.exit(fail ? 1 : 0);
