export const MODELS: { name: string; f: (n: number) => number }[] = [
  { name: 'O(n)', f: (n) => n },
  { name: 'O(n log n)', f: (n) => n * Math.log2(n) },
  { name: 'O(n²)', f: (n) => n * n },
];

/**
 * Fit y ≈ c·f(n) for each model, minimising *relative* error so small n counts as much
 * as large n. Returns models best-first, plus the log-log slope as a sanity check.
 */
export function fitModels(pts: { n: number; y: number }[]) {
  const use = pts.filter((p) => p.y > 0 && p.n > 1);
  const fits = MODELS.map((m) => {
    const sA = use.reduce((s, p) => s + m.f(p.n) / p.y, 0);
    const sB = use.reduce((s, p) => s + (m.f(p.n) / p.y) ** 2, 0);
    const c = sB ? sA / sB : 0;
    const err = Math.sqrt(use.reduce((s, p) => s + ((p.y - c * m.f(p.n)) / p.y) ** 2, 0) / Math.max(1, use.length));
    return { name: m.name, c, err };
  }).sort((a, b) => a.err - b.err);
  let slope = NaN;
  if (use.length >= 2) {
    const xs = use.map((p) => Math.log(p.n));
    const ys = use.map((p) => Math.log(p.y));
    const mx = xs.reduce((a, b) => a + b) / xs.length;
    const my = ys.reduce((a, b) => a + b) / ys.length;
    const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    slope = den ? num / den : NaN;
  }
  return { fits, slope };
}
