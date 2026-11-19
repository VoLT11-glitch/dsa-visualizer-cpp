import { useEffect, useMemo, useState } from 'react';
import { sortingAlgos } from '../algorithms/sorting';
import { Controls } from '../components/Controls';
import { SortView } from '../components/views/SortView';
import { makeInput, type Shape } from '../lab/counters';
import { usePlayer } from '../core/usePlayer';
import { useKeys } from '../core/keys';
import type { Frame, SortState } from '../core/types';

/** Running totals per frame: a frame with a 'cmp' mark is one comparison, swap/write marks are moves. */
function tally(frames: Frame<SortState>[]) {
  let cmp = 0;
  let mv = 0;
  return frames.map((f) => {
    const marks = Object.values(f.state.marks);
    if (marks.includes('cmp')) cmp++;
    if (marks.includes('swap') || marks.includes('write')) mv++;
    return { cmp, mv };
  });
}

export function Race() {
  const [ids, setIds] = useState<[string, string]>(['bubble', 'quick']);
  const [shape, setShape] = useState<Shape>('random');
  const [n, setN] = useState(24);
  const [seed, setSeed] = useState(0);
  const input = useMemo(() => makeInput(n, shape).map((x) => 1 + (x % 99)), [n, shape, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const lanes = useMemo(() => ids.map((id) => {
    const algo = sortingAlgos.find((a) => a.id === id)!;
    const frames = algo.kind === 'sort' ? algo.run(input) : [];
    return { algo, frames, counts: tally(frames) };
  }), [ids, input]);

  const count = Math.max(...lanes.map((l) => l.frames.length));
  const p = usePlayer(count, lanes);
  const onKey = useKeys(p);
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const finished = lanes.map((l) => p.idx >= l.frames.length - 1);
  const winner = lanes[0].frames.length === lanes[1].frames.length ? -1 : lanes[0].frames.length < lanes[1].frames.length ? 0 : 1;

  return (
    <div className="lab race">
      <header className="stage-head">
        <div>
          <h1>Race</h1>
          <p className="muted note">Two sorts, the same input, one clock. Each tick is one step of the algorithm (a comparison, a swap, a write…).</p>
        </div>
      </header>
      <div className="inputs">
        {[0, 1].map((k) => (
          <label key={k}>{k ? 'right' : 'left'}
            <select value={ids[k]} onChange={(e) => setIds((cur) => (k ? [cur[0], e.target.value] : [e.target.value, cur[1]]))}>
              {sortingAlgos.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
        ))}
        <label>input
          <select value={shape} onChange={(e) => setShape(e.target.value as Shape)}>
            <option value="random">random</option>
            <option value="sorted">already sorted</option>
            <option value="reversed">reversed</option>
            <option value="nearly">nearly sorted</option>
          </select>
        </label>
        <label>n
          <input type="number" className="num" min={5} max={40} value={n} onChange={(e) => setN(Math.max(5, Math.min(40, Number(e.target.value) || 5)))} />
        </label>
        <button onClick={() => setSeed((s) => s + 1)}>New input</button>
      </div>

      <div className="lanes">
        {lanes.map((l, k) => {
          const i = Math.min(p.idx, l.frames.length - 1);
          const c = l.counts[i];
          return (
            <div key={k} className={`lane ${finished[k] && winner === k ? 'won' : ''}`}>
              <div className="lane-head">
                <strong>{l.algo.name}</strong>
                <span className="badge">{l.algo.time}</span>
                {finished[k] && <span className={`chip ${winner === k ? 'ok' : ''}`}>{winner === k ? '🏁 winner' : winner === -1 ? 'tie' : 'done'} · {l.frames.length} steps</span>}
              </div>
              <div className="canvas lane-canvas"><SortView s={l.frames[i].state} /></div>
              <div className="lane-stats">
                <span><span className="muted">comparisons</span> <b>{c.cmp}</b></span>
                <span><span className="muted">swaps/writes</span> <b>{c.mv}</b></span>
                <span><span className="muted">step</span> <b>{i + 1}</b> / {l.frames.length}</span>
              </div>
            </div>
          );
        })}
      </div>
      <Controls p={p} count={count} />
      <p className="muted hint">Try <em>already sorted</em>: bubble and insertion finish almost instantly while quick sort crawls.</p>
    </div>
  );
}
