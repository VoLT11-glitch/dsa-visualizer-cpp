import { useState } from 'react';
import { LineChart } from '../components/LineChart';
import { runCpp, type RunResult } from '../lib/judge0';
import { buildHarness, parseTimings, PRESETS, type Shape } from '../lab/harness';
import { fitModels } from '../lab/fit';

type Side = { code: string; result?: RunResult; pts?: { n: number; t: number }[]; error?: string };
const COLORS = ['var(--c1)', 'var(--c5)'];
const fmtT = (t: number) => (t >= 1 ? `${t.toFixed(2)} s` : t >= 1e-3 ? `${(t * 1e3).toFixed(2)} ms` : `${(t * 1e6).toFixed(1)} µs`);

export function Analyze() {
  const [sides, setSides] = useState<Side[]>([{ code: PRESETS[0].a }, { code: PRESETS[0].b }]);
  const [shape, setShape] = useState<Shape>('random');
  const [nMax, setNMax] = useState(1 << 18);
  const [busy, setBusy] = useState(false);

  const setCode = (i: number, code: string) => setSides((s) => s.map((x, k) => (k === i ? { code } : x)));
  const run = async () => {
    setBusy(true);
    setSides((s) => s.map((x) => ({ code: x.code })));
    const results = await Promise.all(sides.map(async (side): Promise<Side> => {
      if (!/\bsolve\s*\(/.test(side.code)) return { code: side.code, error: 'Define void solve(vector<int>& a).' };
      try {
        const res = await runCpp(buildHarness(side.code, shape, 64, nMax, 6), { cpuLimit: 10 });
        const pts = parseTimings(res.stdout);
        const error = res.compileError ? 'Compile error' : !pts.length ? `${res.status}${res.stderr ? ': ' + res.stderr.slice(0, 300) : ''}` : undefined;
        return { code: side.code, result: res, pts, error };
      } catch (e) {
        return { code: side.code, error: (e as Error).message };
      }
    }));
    setSides(results);
    setBusy(false);
  };

  const fits = sides.map((s) => (s.pts && s.pts.length >= 3 ? fitModels(s.pts.map((p) => ({ n: p.n, y: p.t }))) : null));
  const verdict = (() => {
    const [a, b] = sides;
    if (!a.pts?.length || !b.pts?.length) return null;
    const common = a.pts.filter((p) => b.pts!.some((q) => q.n === p.n)).map((p) => ({ n: p.n, a: p.t, b: b.pts!.find((q) => q.n === p.n)!.t }));
    if (!common.length) return null;
    const last = common[common.length - 1];
    const winner = last.a < last.b ? 'A' : 'B';
    const ratio = Math.max(last.a, last.b) / Math.min(last.a, last.b);
    let cross: number | null = null;
    for (let i = common.length - 1; i >= 0; i--) {
      const w = common[i].a < common[i].b ? 'A' : 'B';
      if (w !== winner) { cross = common[i + 1]?.n ?? null; break; }
    }
    const tail = (winner === 'A' ? b : a).pts!.length < (winner === 'A' ? a : b).pts!.length
      ? ` ${winner === 'A' ? 'B' : 'A'} ran out of time budget at n = ${(winner === 'A' ? b : a).pts!.at(-1)!.n.toLocaleString()}.` : '';
    return `${winner} is ${ratio.toFixed(ratio > 10 ? 0 : 1)}× faster at n = ${last.n.toLocaleString()}${cross ? `, and wins from n ≈ ${cross.toLocaleString()} on` : ', and faster at every size tested'}.${tail}`;
  })();

  return (
    <div className="lab">
      <header className="stage-head">
        <div>
          <h1>Analyze your C++</h1>
          <p className="muted note">
            Write two versions of <code>void solve(vector&lt;int&gt;&amp; a)</code>. Each is compiled with g++ 14 (-O2, C++20) on
            Judge0 and timed on n = 64, 128, 256… until a ~6 s budget runs out. The timings are then fitted to O(n), O(n log n)
            and O(n²).
          </p>
        </div>
      </header>

      <div className="inputs">
        <label>example
          <select onChange={(e) => { const p = PRESETS[Number(e.target.value)]; setSides([{ code: p.a }, { code: p.b }]); }} defaultValue={0}>
            {PRESETS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
          </select>
        </label>
        <label>input
          <select value={shape} onChange={(e) => setShape(e.target.value as Shape)}>
            <option value="random">random</option>
            <option value="sorted">already sorted</option>
            <option value="reversed">reversed</option>
            <option value="nearly">nearly sorted</option>
          </select>
        </label>
        <label>max n
          <select value={nMax} onChange={(e) => setNMax(Number(e.target.value))}>
            {[12, 14, 16, 18, 20].map((k) => <option key={k} value={1 << k}>{(1 << k).toLocaleString()}</option>)}
          </select>
        </label>
        <button className="primary" onClick={run} disabled={busy}>{busy ? 'Compiling & running…' : 'Run both'}</button>
      </div>

      <div className="editors">
        {sides.map((s, i) => (
          <div key={i} className="editor">
            <div className="panel-title">
              <span><i className="sw-line" style={{ background: COLORS[i] }} /> Solution {i ? 'B' : 'A'}</span>
              {fits[i] && <span className="fit-badge">{fits[i]!.fits[0].name} <span className="muted">slope {fits[i]!.slope.toFixed(2)}</span></span>}
            </div>
            <textarea value={s.code} onChange={(e) => setCode(i, e.target.value)} spellCheck={false} aria-label={`Solution ${i ? 'B' : 'A'} code`} />
            {s.error && (
              <div className="error">
                {s.error}
                {s.result?.compileError && <pre className="compile-out">{s.result.compileOutput}</pre>}
              </div>
            )}
          </div>
        ))}
      </div>

      {verdict && <div className="msg"><span className="step-msg">{verdict}</span></div>}

      <div className="canvas">
        <LineChart yUnit="s" series={sides.map((s, i) => ({ name: i ? 'B' : 'A', color: COLORS[i], pts: (s.pts ?? []).map((p) => ({ x: p.n, y: p.t })) }))} />
      </div>

      {sides.some((s) => s.pts?.length) && (
        <div className="table-wrap">
          <table className="lab-table">
            <thead><tr><th className="num">n</th><th className="num">A</th><th className="num">B</th></tr></thead>
            <tbody>
              {[...new Set(sides.flatMap((s) => (s.pts ?? []).map((p) => p.n)))].sort((x, y) => x - y).map((n) => (
                <tr key={n}>
                  <td className="num">{n.toLocaleString()}</td>
                  {sides.map((s, i) => { const p = s.pts?.find((q) => q.n === n); return <td key={i} className="num">{p ? fmtT(p.t) : '—'}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted hint">
        Timings come from a shared server, so expect some noise; the shape of the curve matters more than the exact numbers.
        Runs use the free public Judge0 CE instance, which is rate-limited.
      </p>
    </div>
  );
}
