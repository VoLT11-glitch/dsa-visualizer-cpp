import { useEffect, useMemo, useState } from 'react';
import { GROUPS, findAlgo } from '../algorithms/registry';
import { NODES } from '../algorithms/graph';
import { CodePanel } from '../components/CodePanel';
import { Controls } from '../components/Controls';
import { useKeys } from '../core/keys';
import { Vars } from '../components/Vars';
import { SortView } from '../components/views/SortView';
import { GraphView } from '../components/views/GraphView';
import { DPView } from '../components/views/DPView';
import { TreeView } from '../components/views/TreeView';
import { usePlayer } from '../core/usePlayer';
import type { Algo, DPState, Frame, GraphState, KnapInput, LcsInput, SortState, TreeState } from '../core/types';

const randArr = (n: number, max = 99) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * max));
const parseInts = (s: string) =>
  s.split(/[\s,]+/).filter(Boolean).map(Number).filter((x) => Number.isInteger(x));

type Inputs = { arr: number[]; src: number; lcs: LcsInput; knap: KnapInput; tree: number[] };
const DEFAULTS: Inputs = {
  arr: [38, 27, 43, 3, 9, 82, 10, 55, 19, 64],
  src: 0,
  lcs: { a: 'ABCBDAB', b: 'BDCABA' },
  knap: { wt: [1, 3, 4, 5], val: [1, 4, 5, 7], W: 7 },
  tree: [50, 30, 70, 20, 40, 60, 80, 35, 65],
};

function runAlgo(algo: Algo, inp: Inputs): Frame<unknown>[] {
  switch (algo.kind) {
    case 'sort': return algo.run(inp.arr);
    case 'graph': return algo.run(inp.src);
    case 'lcs': return algo.run(inp.lcs);
    case 'knap': return algo.run(inp.knap);
    case 'tree': return algo.run(inp.tree);
  }
}

export function Visualizer({ algoId, onPick }: { algoId: string; onPick: (id: string) => void }) {
  const algo = findAlgo(algoId) ?? GROUPS[0].algos[0];
  const [inp, setInp] = useState<Inputs>(DEFAULTS);

  const { frames, error } = useMemo(() => {
    try {
      return { frames: runAlgo(algo, inp), error: '' };
    } catch (e) {
      return { frames: [] as Frame<unknown>[], error: String(e) };
    }
  }, [algo, inp]);

  const p = usePlayer(frames.length, frames);
  const onKey = useKeys(p);
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);
  useEffect(() => {
    document.querySelector('.algo-btn.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [algo.id]);

  const f = frames[p.idx];

  return (
    <div className="viz-layout">
      <nav className="algo-nav" aria-label="Algorithms">
        {GROUPS.map((g) => (
          <div key={g.title} className="algo-group">
            <div className="group-title">{g.title}</div>
            {g.algos.map((a) => (
              <button key={a.id} className={`algo-btn ${a.id === algo.id ? 'active' : ''}`} onClick={() => onPick(a.id)}>
                {a.name}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <section className="stage">
        <header className="stage-head">
          <div>
            <h1>{algo.name}</h1>
            <p className="muted note">{algo.note}</p>
          </div>
          <div className="badges">
            <span className="badge">time {algo.time}</span>
            <span className="badge">space {algo.space}</span>
          </div>
        </header>

        <InputPanel algo={algo} inp={inp} setInp={setInp} />

        <div className="canvas">
          {error && <div className="error">{error}</div>}
          {f && algo.kind === 'sort' && <SortView s={f.state as SortState} />}
          {f && algo.kind === 'graph' && <GraphView s={f.state as GraphState} weighted={algo.weighted} />}
          {f && (algo.kind === 'lcs' || algo.kind === 'knap') && <DPView s={f.state as DPState} />}
          {f && algo.kind === 'tree' && <TreeView s={f.state as TreeState} />}
        </div>

        <div className="msg" aria-live="polite">
          <span className="step-msg">{f?.msg ?? '—'}</span>
          {f && <Vars vars={(f.state as { vars: Record<string, string | number> }).vars} />}
        </div>
        <Controls p={p} count={frames.length} />
        <p className="muted hint">Space play/pause · ← → step · Home/End jump</p>
      </section>

      <aside className="code-side">
        <CodePanel code={algo.code} line={f?.line ?? 0} />
      </aside>
    </div>
  );
}

function InputPanel({ algo, inp, setInp }: { algo: Algo; inp: Inputs; setInp: (f: (i: Inputs) => Inputs) => void }) {
  switch (algo.kind) {
    case 'sort': return <SortInput arr={inp.arr} set={(arr) => setInp((i) => ({ ...i, arr }))} />;
    case 'graph':
      return (
        <div className="inputs">
          <label>source
            <select value={inp.src} onChange={(e) => setInp((i) => ({ ...i, src: Number(e.target.value) }))}>
              {NODES.map((_, k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <span className="muted">Fixed 8-node sample graph, adjacency lists sorted by neighbour id.</span>
        </div>
      );
    case 'lcs': return <LcsInputPanel v={inp.lcs} set={(lcs) => setInp((i) => ({ ...i, lcs }))} />;
    case 'knap': return <KnapInputPanel v={inp.knap} set={(knap) => setInp((i) => ({ ...i, knap }))} />;
    case 'tree': return <TreeInput v={inp.tree} set={(tree) => setInp((i) => ({ ...i, tree }))} />;
  }
}

function SortInput({ arr, set }: { arr: number[]; set: (a: number[]) => void }) {
  const [text, setText] = useState(arr.join(', '));
  const [n, setN] = useState(arr.length);
  useEffect(() => setText(arr.join(', ')), [arr]);
  const apply = () => {
    const v = parseInts(text).slice(0, 40);
    if (v.length >= 2) set(v);
  };
  return (
    <div className="inputs">
      <label className="grow">array
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} onBlur={apply} spellCheck={false} />
      </label>
      <label>n
        <input type="number" min={2} max={40} value={n} onChange={(e) => setN(Math.min(40, Math.max(2, Number(e.target.value) || 2)))} className="num" />
      </label>
      <button onClick={() => set(randArr(n))}>Random</button>
      <button onClick={() => set(randArr(n).sort((a, b) => a - b))}>Sorted</button>
      <button onClick={() => set(randArr(n).sort((a, b) => b - a))}>Reversed</button>
    </div>
  );
}

function LcsInputPanel({ v, set }: { v: LcsInput; set: (x: LcsInput) => void }) {
  const [a, setA] = useState(v.a);
  const [b, setB] = useState(v.b);
  const apply = () => set({ a: a.slice(0, 12), b: b.slice(0, 12) });
  return (
    <div className="inputs">
      <label>a <input value={a} maxLength={12} onChange={(e) => setA(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} /></label>
      <label>b <input value={b} maxLength={12} onChange={(e) => setB(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} /></label>
      <span className="muted">up to 12 chars each</span>
    </div>
  );
}

function KnapInputPanel({ v, set }: { v: KnapInput; set: (x: KnapInput) => void }) {
  const [wt, setWt] = useState(v.wt.join(', '));
  const [val, setVal] = useState(v.val.join(', '));
  const [W, setW] = useState(String(v.W));
  const [err, setErr] = useState('');
  const apply = () => {
    const w = parseInts(wt).filter((x) => x > 0);
    const vv = parseInts(val);
    const cap = Number(W);
    if (!w.length || w.length !== vv.length) return setErr('weights and values need the same count');
    if (w.length > 6) return setErr('max 6 items');
    if (!Number.isInteger(cap) || cap < 1 || cap > 15) return setErr('capacity must be 1–15');
    setErr('');
    set({ wt: w, val: vv, W: cap });
  };
  const k = (e: React.KeyboardEvent) => e.key === 'Enter' && apply();
  return (
    <div className="inputs">
      <label>weights <input value={wt} onChange={(e) => setWt(e.target.value)} onBlur={apply} onKeyDown={k} /></label>
      <label>values <input value={val} onChange={(e) => setVal(e.target.value)} onBlur={apply} onKeyDown={k} /></label>
      <label>W <input value={W} onChange={(e) => setW(e.target.value)} onBlur={apply} onKeyDown={k} className="num" /></label>
      {err && <span className="error-inline">{err}</span>}
    </div>
  );
}

function TreeInput({ v, set }: { v: number[]; set: (x: number[]) => void }) {
  const [text, setText] = useState(v.join(', '));
  useEffect(() => setText(v.join(', ')), [v]);
  const apply = () => {
    const xs = parseInts(text).slice(0, 15);
    if (xs.length) set(xs);
  };
  return (
    <div className="inputs">
      <label className="grow">insert order
        <input value={text} onChange={(e) => setText(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} />
      </label>
      <button onClick={() => set(randArr(9).filter((x, i, a) => a.indexOf(x) === i))}>Random</button>
      <button onClick={() => set([10, 20, 30, 40, 50])}>Sorted (worst case)</button>
    </div>
  );
}
