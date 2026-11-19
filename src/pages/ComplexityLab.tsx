import { useEffect, useMemo, useState } from 'react';
import { LAB_ALGOS, measure, type Shape } from '../lab/counters';
import { fitModels } from '../lab/fit';

const SIZES = [10, 25, 50, 100, 250, 500, 1000, 2000, 4000];
type Metric = 'cmp' | 'mv' | 'total';
type Row = { id: string; pts: { n: number; cmp: number; mv: number }[]; ok: boolean };

const fmt = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}k` : x.toFixed(0));

export function ComplexityLab() {
  const [shape, setShape] = useState<Shape>('random');
  const [metric, setMetric] = useState<Metric>('total');
  const [logScale, setLogScale] = useState(true);
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(LAB_ALGOS.map((a) => [a.id, true])));
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const trials = shape === 'random' || shape === 'nearly' ? 3 : 1;
      const out: Row[] = LAB_ALGOS.map((a) => {
        let ok = true;
        const pts = SIZES.map((n) => {
          const r = measure(a.fn, n, shape, trials);
          ok &&= r.ok;
          return { n, cmp: r.cmp, mv: r.mv };
        });
        return { id: a.id, pts, ok };
      });
      setRows(out);
      setBusy(false);
    }, 20);
  };
  useEffect(run, [shape]);  

  const val = (p: { cmp: number; mv: number }) => (metric === 'cmp' ? p.cmp : metric === 'mv' ? p.mv : p.cmp + p.mv);
  const visible = rows.filter((r) => on[r.id]);
  const fits = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.id, fitModels(r.pts.map((p) => ({ n: p.n, y: val(p) })))])),
    [rows, metric], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="lab">
      <header className="stage-head">
        <div>
          <h1>Complexity lab</h1>
          <p className="muted note">
            Runs each sort on n = {SIZES[0]}…{SIZES[SIZES.length - 1]} in your browser and counts operations, then fits
            the counts to O(n), O(n log n) and O(n²). Change the input shape and watch the "same" algorithm change class.
          </p>
        </div>
      </header>

      <div className="inputs">
        <label>input
          <select value={shape} onChange={(e) => setShape(e.target.value as Shape)}>
            <option value="random">random</option>
            <option value="sorted">already sorted</option>
            <option value="reversed">reversed</option>
            <option value="nearly">nearly sorted (5% swapped)</option>
          </select>
        </label>
        <label>count
          <select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}>
            <option value="total">comparisons + moves</option>
            <option value="cmp">comparisons</option>
            <option value="mv">moves (swaps / writes)</option>
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={logScale} onChange={(e) => setLogScale(e.target.checked)} /> log–log axes</label>
        <button onClick={run} disabled={busy}>{busy ? 'Running…' : 'Re-run'}</button>
      </div>

      <div className="algo-toggles">
        {LAB_ALGOS.map((a) => (
          <label key={a.id} className="toggle">
            <input type="checkbox" checked={on[a.id]} onChange={(e) => setOn((o) => ({ ...o, [a.id]: e.target.checked }))} />
            <i className="sw-line" style={{ background: a.color }} /> {a.name}
          </label>
        ))}
      </div>

      <div className="canvas">
        <Chart rows={visible} val={val} log={logScale} />
      </div>

      <div className="table-wrap">
        <table className="lab-table">
          <thead>
            <tr>
              <th>algorithm</th>
              <th>best fit</th>
              <th title="slope of log(count) vs log(n): ≈1 linear, ≈2 quadratic">log–log slope</th>
              {SIZES.map((n) => <th key={n} className="num">n={n}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const a = LAB_ALGOS.find((x) => x.id === r.id)!;
              const f = fits[r.id];
              return (
                <tr key={r.id}>
                  <td><i className="sw-line" style={{ background: a.color }} /> {a.name}{!r.ok && <span className="error-inline"> (unsorted!)</span>}</td>
                  <td><strong>{f?.fits[0].name}</strong> <span className="muted">±{((f?.fits[0].err ?? 0) * 100).toFixed(0)}%</span></td>
                  <td>{f ? f.slope.toFixed(2) : ''}</td>
                  {r.pts.map((p) => <td key={p.n} className="num">{fmt(val(p))}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted hint">
        Best fit picks the model with the lowest relative error for count ≈ c·f(n). Things to try: bubble and insertion
        on <em>already sorted</em> (linear), quick sort on <em>already sorted</em> (quadratic — last-element pivot), merge
        and heap barely move.
      </p>
    </div>
  );
}

function Chart({ rows, val, log }: { rows: Row[]; val: (p: { cmp: number; mv: number }) => number; log: boolean }) {
  const W = 720, H = 340, L = 62, R = 16, T = 14, B = 40;
  const all = rows.flatMap((r) => r.pts.map(val)).filter((v) => v > 0);
  if (!all.length) return <div className="muted empty-tree">Pick at least one algorithm.</div>;
  const nMin = SIZES[0], nMax = SIZES[SIZES.length - 1];
  const yMax = Math.max(...all), yMin = Math.max(1, Math.min(...all));
  const sx = (n: number) => L + (log ? (Math.log(n) - Math.log(nMin)) / (Math.log(nMax) - Math.log(nMin)) : (n - 0) / nMax) * (W - L - R);
  const sy = (y: number) => {
    const t = log ? (Math.log(Math.max(1, y)) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin) || 1) : y / yMax;
    return H - B - t * (H - T - B);
  };
  const yTicks = log
    ? Array.from({ length: 12 }, (_, k) => 10 ** k).filter((v) => v >= yMin / 1.01 && v <= yMax * 1.01)
    : [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);
  const xTicks = log ? SIZES : [0, 1000, 2000, 3000, 4000];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Operation count vs n">
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} className="grid" />
          <text x={L - 8} y={sy(v) + 4} className="axis-t" textAnchor="end">{fmt(v)}</text>
        </g>
      ))}
      {xTicks.map((n) => (
        <text key={n} x={sx(n)} y={H - B + 18} className="axis-t" textAnchor="middle">{n}</text>
      ))}
      <text x={(L + W - R) / 2} y={H - 4} className="axis-t" textAnchor="middle">n</text>
      <line x1={L} x2={L} y1={T} y2={H - B} className="axis" />
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="axis" />
      {rows.map((r) => {
        const a = LAB_ALGOS.find((x) => x.id === r.id)!;
        const pts = r.pts.filter((p) => !log || val(p) > 0);
        return (
          <g key={r.id} style={{ color: a.color }}>
            <polyline points={pts.map((p) => `${sx(p.n)},${sy(val(p))}`).join(' ')} className="series" />
            {pts.map((p) => (
              <circle key={p.n} cx={sx(p.n)} cy={sy(val(p))} r={3} className="pt">
                <title>{`${a.name}, n=${p.n}: ${Math.round(val(p)).toLocaleString()}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
