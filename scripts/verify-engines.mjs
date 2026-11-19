// Runs every algorithm engine headlessly and checks the final frames are correct.
import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p) => server.ssrLoadModule(p);
const { ALL_ALGOS } = await load('/src/algorithms/registry.ts');
const { LAB_ALGOS, measure } = await load('/src/lab/counters.ts');
const { fitModels } = await load('/src/lab/fit.ts');
const { parseTrace, Replay } = await load('/src/replay/trace.ts');
const fs = await import('node:fs');
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
    console.log(`ok ${a.id} (frames for n=10: ${a.run([5,3,8,1,9,2,7,4,6,0]).length})`);
  } else if (a.kind === 'graph') {
    for (let s = 0; s < 8; s++) {
      const fr = a.run(s);
      const st = fr[fr.length - 1].state;
      check(new Set(st.order).size === 8, `${a.id} src ${s} reaches all`);
      check(st.order[0] === s, `${a.id} starts at src`);
    }
    console.log(`ok ${a.id}: ${a.run(0).at(-1).msg}`);
  } else if (a.kind === 'lcs') {
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
await server.close();
console.log(fail ? `${fail} FAILURES` : 'ALL OK');
process.exit(fail ? 1 : 0);
