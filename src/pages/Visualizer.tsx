import { useEffect, useMemo, useRef, useState } from 'react';
import { GROUPS, findAlgo } from '../algorithms/registry';
import { SAMPLE_GRAPH, randomGraph } from '../algorithms/graph';
import { CodePanel } from '../components/CodePanel';
import { Controls } from '../components/Controls';
import { Vars } from '../components/Vars';
import { SortView } from '../components/views/SortView';
import { GraphView } from '../components/views/GraphView';
import { DPView } from '../components/views/DPView';
import { TreeView } from '../components/views/TreeView';
import { RecursionTree } from '../components/views/RecursionTree';
import { usePlayer } from '../core/usePlayer';
import { useKeys } from '../core/keys';
import { fromParams, toParams, type Inputs } from '../core/share';
import type { Algo, CallNode, DPState, Frame, GraphState, KnapInput, SortState, StrInput, TreeState } from '../core/types';

const randArr = (n: number, max = 99) => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * max));
const parseInts = (s: string) =>
  s.split(/[\s,]+/).filter(Boolean).map(Number).filter((x) => Number.isInteger(x));

const DEFAULTS: Inputs = {
  arr: [38, 27, 43, 3, 9, 82, 10, 55, 19, 64],
  target: 55,
  k: 3,
  src: 0,
  graph: SAMPLE_GRAPH,
  str: { a: 'ABCBDAB', b: 'BDCABA' },
  knap: { wt: [1, 3, 4, 5], val: [1, 4, 5, 7], W: 7 },
  tree: [50, 30, 70, 20, 40, 60, 80, 35, 65],
};

function runAlgo(algo: Algo, inp: Inputs): Frame<unknown>[] {
  switch (algo.kind) {
    case 'sort': return algo.run(inp.arr);
    case 'search': return algo.run({ arr: inp.arr, target: inp.target });
    case 'window': return algo.run({ arr: inp.arr, k: inp.k });
    case 'graph':
      if (!inp.graph.nodes.length) throw new Error('The graph is empty. Click "Edit graph" and add some nodes.');
      return algo.run({ graph: inp.graph, src: Math.min(inp.src, inp.graph.nodes.length - 1) });
    case 'twoStr': return algo.run(inp.str);
    case 'knap': return algo.run(inp.knap);
    case 'lis': return algo.run(inp.arr);
    case 'tree': return algo.run(inp.tree);
  }
}

const shareUrl = (algo: Algo, inp: Inputs, step: number) =>
  `${location.origin}${location.pathname}#/viz/${algo.id}?${toParams(algo.kind, inp, step)}`;

export function Visualizer({ algoId, params, onPick }: { algoId: string; params: URLSearchParams; onPick: (id: string) => void }) {
  const algo = findAlgo(algoId) ?? GROUPS[0].algos[0];
  const initial = useRef(fromParams(params, DEFAULTS));
  const [inp, setInp] = useState<Inputs>(initial.current.inp);
  const [editing, setEditing] = useState(false);
  const [showTree, setShowTree] = useState(true);
  const [quiz, setQuiz] = useState(false);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [fb, setFb] = useState<{ right: number; wrong?: number } | null>(null);
  const [toast, setToast] = useState('');

  const { frames, error } = useMemo(() => {
    try {
      return { frames: runAlgo(algo, inp), error: '' };
    } catch (e) {
      return { frames: [] as Frame<unknown>[], error: (e as Error).message };
    }
  }, [algo, inp]);

  const p = usePlayer(frames.length, frames);
  const onKey = useKeys(p);
  useEffect(() => {
    if (quiz) return;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey, quiz]);
  useEffect(() => {
    document.querySelector('.algo-btn.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setEditing(false);
  }, [algo.id]);

  // Jump to the step from a shared link, once.
  const pendingStep = useRef(initial.current.step);
  useEffect(() => {
    if (pendingStep.current && frames.length) p.seek(Math.min(pendingStep.current, frames.length - 1));
  }, [frames]); // eslint-disable-line react-hooks/exhaustive-deps
  // Only forget the pending step once it has actually landed (StrictMode re-runs mount effects).
  useEffect(() => {
    if (pendingStep.current && p.idx === Math.min(pendingStep.current, frames.length - 1)) pendingStep.current = 0;
  }, [p.idx, frames.length]);

  // Keep the address bar in sync (no step) so a reload keeps your input.
  useEffect(() => {
    const url = `#/viz/${algo.id}?${toParams(algo.kind, inp, 0)}`;
    if (location.hash !== url) history.replaceState(null, '', url);
  }, [algo, inp]);

  useEffect(() => {
    setScore({ right: 0, total: 0 });
    setFb(null);
  }, [frames, quiz]);

  const f = frames[p.idx];
  const state = f?.state as { vars: Record<string, string | number>; calls?: CallNode[]; activeCall?: number | null } | undefined;

  const guess = (line: number) => {
    if (fb || p.idx >= p.last) return;
    const next = frames[p.idx + 1].line;
    const ok = line === next;
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    setFb({ right: next, wrong: ok ? undefined : line });
    setTimeout(() => { setFb(null); p.step(1); }, ok ? 450 : 1200);
  };

  const share = async () => {
    const url = shareUrl(algo, inp, p.idx);
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied: opens at this exact step');
    } catch {
      window.prompt('Copy this link:', url);
    }
    setTimeout(() => setToast(''), 2200);
  };

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

        <InputPanel algo={algo} inp={inp} setInp={setInp} editing={editing} setEditing={setEditing} />

        <div className="canvas">
          {error && <div className="error">{error}</div>}
          {algo.kind === 'graph' && editing && (
            <GraphView graph={inp.graph} weighted={algo.weighted} directed={algo.directed} editing
              onChange={(graph) => setInp((i) => ({ ...i, graph, src: Math.min(i.src, Math.max(0, graph.nodes.length - 1)) }))} />
          )}
          {f && !editing && (
            <>
              {(algo.kind === 'sort' || algo.kind === 'search' || algo.kind === 'window') && <SortView s={f.state as SortState} />}
              {algo.kind === 'graph' && <GraphView graph={inp.graph} s={f.state as GraphState} weighted={algo.weighted} directed={algo.directed} />}
              {(algo.kind === 'twoStr' || algo.kind === 'knap' || algo.kind === 'lis') && <DPView s={f.state as DPState} />}
              {algo.kind === 'tree' && <TreeView s={f.state as TreeState} />}
            </>
          )}
        </div>

        {!editing && state?.calls && showTree && (
          <div className="canvas slim"><RecursionTree calls={state.calls} active={state.activeCall} /></div>
        )}

        {!editing && (
          <>
            <div className={`msg ${quiz ? 'quiz-msg' : ''}`} aria-live="polite">
              {quiz ? (
                <span className="step-msg">
                  {p.idx >= p.last
                    ? `Done! You got ${score.right} of ${score.total} right.`
                    : fb ? (fb.wrong ? `Not quite: it's line ${fb.right}. ${frames[p.idx + 1].msg}` : `Correct! ${frames[p.idx + 1].msg}`)
                    : <>Which line runs next? <b>Click it in the code.</b></>}
                  <span className="score">{score.right} / {score.total}</span>
                </span>
              ) : (
                <span className="step-msg">{f?.msg ?? '—'}</span>
              )}
              {f && state && <Vars vars={state.vars} />}
            </div>
            <Controls p={p} count={frames.length} />
            <div className="toolbar">
              <button className="small" onClick={share} disabled={!frames.length}>Share this step</button>
              <label className="check small-label">
                <input type="checkbox" checked={quiz} onChange={(e) => { setQuiz(e.target.checked); if (p.playing) p.toggle(); }} /> Quiz mode
              </label>
              {algo.recursive && (
                <label className="check small-label">
                  <input type="checkbox" checked={showTree} onChange={(e) => setShowTree(e.target.checked)} /> Recursion tree
                </label>
              )}
              <span className="muted hint">Space play/pause · ← → step · Home/End jump</span>
            </div>
          </>
        )}
        {toast && <div className="toast" role="status">{toast}</div>}
      </section>

      <aside className="code-side">
        <CodePanel code={algo.code} line={f?.line ?? 0} onLineClick={quiz && !editing ? guess : undefined} feedback={fb} />
      </aside>
    </div>
  );
}

type SetInp = (f: (i: Inputs) => Inputs) => void;

function InputPanel({ algo, inp, setInp, editing, setEditing }: { algo: Algo; inp: Inputs; setInp: SetInp; editing: boolean; setEditing: (b: boolean) => void }) {
  switch (algo.kind) {
    case 'sort': return <ArrayInput arr={inp.arr} max={40} set={(arr) => setInp((i) => ({ ...i, arr }))} />;
    case 'lis': return <ArrayInput arr={inp.arr} max={16} set={(arr) => setInp((i) => ({ ...i, arr }))} />;
    case 'search':
      return (
        <ArrayInput arr={inp.arr} max={40} set={(arr) => setInp((i) => ({ ...i, arr }))}>
          <NumField label="target" value={inp.target} set={(target) => setInp((i) => ({ ...i, target }))} />
        </ArrayInput>
      );
    case 'window':
      return (
        <ArrayInput arr={inp.arr} max={40} set={(arr) => setInp((i) => ({ ...i, arr }))}>
          <NumField label="k" value={inp.k} min={1} max={inp.arr.length} set={(k) => setInp((i) => ({ ...i, k }))} />
        </ArrayInput>
      );
    case 'graph': {
      const needsSrc = !['topo', 'kruskal'].includes(algo.id);
      return (
        <div className="inputs">
          {needsSrc && (
            <label>source
              <select value={Math.min(inp.src, inp.graph.nodes.length - 1)} onChange={(e) => setInp((i) => ({ ...i, src: Number(e.target.value) }))} disabled={editing}>
                {inp.graph.nodes.map((_, k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
          )}
          <button className={editing ? 'primary' : ''} onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : 'Edit graph'}</button>
          <button onClick={() => setInp((i) => ({ ...i, graph: randomGraph(6 + Math.floor(Math.random() * 4)), src: 0 }))}>Random</button>
          <button onClick={() => setInp((i) => ({ ...i, graph: SAMPLE_GRAPH, src: 0 }))}>Sample</button>
          {editing && <button onClick={() => setInp((i) => ({ ...i, graph: { nodes: [], edges: [] }, src: 0 }))}>Clear</button>}
          <span className="muted">{inp.graph.nodes.length} nodes · {inp.graph.edges.length} edges{algo.directed ? ' · directed (u → v)' : ''}</span>
        </div>
      );
    }
    case 'twoStr': return <StrInputPanel v={inp.str} set={(str) => setInp((i) => ({ ...i, str }))} />;
    case 'knap': return <KnapInputPanel v={inp.knap} set={(knap) => setInp((i) => ({ ...i, knap }))} />;
    case 'tree': return <TreeInput v={inp.tree} set={(tree) => setInp((i) => ({ ...i, tree }))} />;
  }
}

function NumField({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min?: number; max?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const apply = () => {
    let n = Number(text);
    if (!Number.isFinite(n)) return setText(String(value));
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    set(Math.round(n));
  };
  return (
    <label>{label}
      <input className="num" value={text} onChange={(e) => setText(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} />
    </label>
  );
}

function ArrayInput({ arr, set, max, children }: { arr: number[]; set: (a: number[]) => void; max: number; children?: React.ReactNode }) {
  const [text, setText] = useState(arr.join(', '));
  const [n, setN] = useState(Math.min(arr.length, max));
  useEffect(() => setText(arr.join(', ')), [arr]);
  const apply = () => {
    const v = parseInts(text).slice(0, max);
    if (v.length >= 2) set(v);
  };
  return (
    <div className="inputs">
      <label className="grow">array
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} onBlur={apply} spellCheck={false} />
      </label>
      {children}
      <label>n
        <input type="number" min={2} max={max} value={n} onChange={(e) => setN(Math.min(max, Math.max(2, Number(e.target.value) || 2)))} className="num" />
      </label>
      <button onClick={() => set(randArr(n))}>Random</button>
      <button onClick={() => set(randArr(n).sort((a, b) => a - b))}>Sorted</button>
      <button onClick={() => set(randArr(n).sort((a, b) => b - a))}>Reversed</button>
    </div>
  );
}

function StrInputPanel({ v, set }: { v: StrInput; set: (x: StrInput) => void }) {
  const [a, setA] = useState(v.a);
  const [b, setB] = useState(v.b);
  useEffect(() => { setA(v.a); setB(v.b); }, [v]);
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
