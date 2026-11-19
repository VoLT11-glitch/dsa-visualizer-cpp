export interface Series { name: string; color: string; pts: { x: number; y: number }[] }

const fmt = (v: number, unit: string) => {
  if (unit === 's') {
    if (v >= 1) return `${v.toFixed(2)}s`;
    if (v >= 1e-3) return `${(v * 1e3).toFixed(v >= 1e-2 ? 0 : 1)}ms`;
    if (v >= 1e-6) return `${(v * 1e6).toFixed(0)}µs`;
    return `${(v * 1e9).toFixed(0)}ns`;
  }
  return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : `${Math.round(v)}`;
};

/** Log–log line chart. */
export function LineChart({ series, yUnit = '', xLabel = 'n' }: { series: Series[]; yUnit?: string; xLabel?: string }) {
  const all = series.flatMap((s) => s.pts).filter((p) => p.x > 0 && p.y > 0);
  if (!all.length) return <div className="muted empty-tree">No data yet.</div>;
  const W = 720, H = 320, L = 66, R = 16, T = 14, B = 40;
  const xMin = Math.min(...all.map((p) => p.x)), xMax = Math.max(...all.map((p) => p.x));
  const yMin = Math.min(...all.map((p) => p.y)), yMax = Math.max(...all.map((p) => p.y));
  const lx = (v: number) => Math.log(v);
  const sx = (x: number) => L + ((lx(x) - lx(xMin)) / (lx(xMax) - lx(xMin) || 1)) * (W - L - R);
  const sy = (y: number) => H - B - ((lx(y) - lx(yMin)) / (lx(yMax) - lx(yMin) || 1)) * (H - T - B);
  const decades = [];
  for (let e = Math.floor(Math.log10(yMin)); e <= Math.ceil(Math.log10(yMax)); e++) {
    const v = 10 ** e;
    if (v >= yMin / 1.01 && v <= yMax * 1.01) decades.push(v);
  }
  const xs = [...new Set(all.map((p) => p.x))].sort((a, b) => a - b);
  const xTicks = xs.filter((_, i) => xs.length <= 8 || i % Math.ceil(xs.length / 8) === 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Measurements vs n">
      {decades.map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} className="grid" />
          <text x={L - 8} y={sy(v) + 4} className="axis-t" textAnchor="end">{fmt(v, yUnit)}</text>
        </g>
      ))}
      {xTicks.map((x) => <text key={x} x={sx(x)} y={H - B + 18} className="axis-t" textAnchor="middle">{fmt(x, '')}</text>)}
      <text x={(L + W - R) / 2} y={H - 4} className="axis-t" textAnchor="middle">{xLabel} (log scale)</text>
      <line x1={L} x2={L} y1={T} y2={H - B} className="axis" />
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} className="axis" />
      {series.map((s) => (
        <g key={s.name} style={{ color: s.color }}>
          <polyline points={s.pts.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} className="series" />
          {s.pts.map((p) => (
            <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3.5} className="pt">
              <title>{`${s.name}: ${xLabel}=${p.x.toLocaleString()} → ${fmt(p.y, yUnit)}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}
