import { useEffect, useMemo, useState } from 'react';
import { CodePanel } from '../components/CodePanel';
import { Controls } from '../components/Controls';
import { useKeys } from '../core/keys';
import { Vars } from '../components/Vars';
import { SortView } from '../components/views/SortView';
import { usePlayer } from '../core/usePlayer';
import { parseTrace, Replay, type Trace } from '../replay/trace';
import exampleTrace from '../../cpp/examples/trace.json?raw';
import exampleSrc from '../../cpp/examples/insertion_trace.cpp?raw';
import headerSrc from '../../cpp/tracked_vector.hpp?raw';

const toLines = (s: string) => s.replace(/\r/g, '').trimEnd().split('\n');

export function TraceReplay() {
  const [trace, setTrace] = useState<Trace>(() => parseTrace(exampleTrace));
  const [src, setSrc] = useState(exampleSrc);
  const [vec, setVec] = useState(0);
  const [err, setErr] = useState('');
  const [paste, setPaste] = useState('');
  const [editSrc, setEditSrc] = useState(false);

  const replay = useMemo(() => new Replay(trace, vec), [trace, vec]);
  const p = usePlayer(replay.count, replay);
  const onKey = useKeys(p);
  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);
  const f = replay.frame(p.idx);

  const load = (text: string, source?: string) => {
    try {
      const t = parseTrace(text);
      setTrace(t);
      setVec(t.vectors[0]?.id ?? 0);
      setErr('');
      if (source !== undefined) setSrc(source);
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const onFile = async (file: File) => {
    const text = await file.text();
    if (file.name.endsWith('.json')) load(text);
    else setSrc(text);
  };
  const downloadHeader = () => {
    const url = URL.createObjectURL(new Blob([headerSrc], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tracked_vector.hpp';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="viz-layout replay">
      <aside className="algo-nav replay-side">
        <div className="group-title">How it works</div>
        <ol className="steps">
          <li><button className="linklike" onClick={downloadHeader}>Download tracked_vector.hpp</button></li>
          <li>Swap <code>vector&lt;int&gt;</code> for <code>TrackedVector&lt;int&gt;</code> in your solution.</li>
          <li>Build with <code>g++ -std=c++20</code> and run it. It writes <code>trace.json</code> on exit.</li>
          <li>Load the trace (and your .cpp for line highlighting) below.</li>
        </ol>
        <div className="group-title">Load</div>
        <label className="file-btn">
          trace.json / your .cpp
          <input type="file" accept=".json,.cpp,.cc,.cxx,.hpp,.h,.txt" multiple onChange={(e) => { Array.from(e.target.files ?? []).forEach(onFile); e.target.value = ''; }} />
        </label>
        <textarea className="paste" placeholder="…or paste trace JSON here" value={paste} onChange={(e) => setPaste(e.target.value)} spellCheck={false} />
        <div className="row">
          <button onClick={() => load(paste)} disabled={!paste.trim()}>Load pasted</button>
          <button onClick={() => { load(exampleTrace, exampleSrc); setPaste(''); }}>Example</button>
        </div>
        {err && <div className="error">{err}</div>}
        {trace.truncated && <div className="error">Trace hit TV_MAX_OPS and was cut short.</div>}
      </aside>

      <section className="stage">
        <header className="stage-head">
          <div>
            <h1>Trace replay</h1>
            <p className="muted note">Every read, write, compare and swap your C++ did on a TrackedVector, in order.</p>
          </div>
          {trace.vectors.length > 1 && (
            <label className="inline">vector
              <select value={vec} onChange={(e) => setVec(Number(e.target.value))}>
                {trace.vectors.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.init.length})</option>)}
              </select>
            </label>
          )}
        </header>
        <div className="canvas">
          <SortView s={f.state} />
        </div>
        <div className="msg" aria-live="polite">
          <span className="step-msg">{f.msg}</span>
          <Vars vars={f.state.vars} />
        </div>
        <Controls p={p} count={replay.count} />
        <p className="muted hint">Space play/pause · ← → step · Home/End jump</p>
      </section>

      <aside className="code-side">
        <div className="row right">
          <button className="small" onClick={() => setEditSrc((x) => !x)}>{editSrc ? 'Done' : 'Edit source'}</button>
        </div>
        {editSrc ? (
          <textarea className="src-edit" value={src} onChange={(e) => setSrc(e.target.value)} spellCheck={false} />
        ) : (
          <CodePanel code={toLines(src)} line={f.line} title="your C++" />
        )}
      </aside>
    </div>
  );
}
