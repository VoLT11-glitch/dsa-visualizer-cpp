/** Same algorithms as the visualizer, stripped down to count operations at scale. */
export type Counts = { cmp: number; mv: number };
type Sorter = (a: number[], c: Counts) => void;

const swap = (a: number[], i: number, j: number, c: Counts) => {
  const t = a[i]; a[i] = a[j]; a[j] = t; c.mv++;
};

const bubble: Sorter = (a, c) => {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      c.cmp++;
      if (a[j] > a[j + 1]) { swap(a, j, j + 1, c); swapped = true; }
    }
    if (!swapped) break;
  }
};

const insertion: Sorter = (a, c) => {
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && (c.cmp++, a[j] > key)) { a[j + 1] = a[j]; c.mv++; j--; }
    a[j + 1] = key; c.mv++;
  }
};

const selection: Sorter = (a, c) => {
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let m = i;
    for (let j = i + 1; j < n; j++) { c.cmp++; if (a[j] < a[m]) m = j; }
    swap(a, i, m, c);
  }
};

const merge: Sorter = (a, c) => {
  const ms = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = lo + ((hi - lo) >> 1);
    ms(lo, mid); ms(mid + 1, hi);
    const tmp: number[] = [];
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) { c.cmp++; tmp.push(a[i] <= a[j] ? a[i++] : a[j++]); }
    while (i <= mid) tmp.push(a[i++]);
    while (j <= hi) tmp.push(a[j++]);
    for (let k = lo; k <= hi; k++) { a[k] = tmp[k - lo]; c.mv++; }
  };
  ms(0, a.length - 1);
};

const quick: Sorter = (a, c) => {
  // Iterative so sorted input (O(n²), depth n) can't blow the JS stack.
  const st: [number, number][] = [[0, a.length - 1]];
  while (st.length) {
    const [lo, hi] = st.pop()!;
    if (lo >= hi) continue;
    const pivot = a[hi];
    let i = lo - 1;
    for (let j = lo; j < hi; j++) { c.cmp++; if (a[j] < pivot) { i++; swap(a, i, j, c); } }
    swap(a, i + 1, hi, c);
    st.push([lo, i], [i + 2, hi]);
  }
};

const heap: Sorter = (a, c) => {
  const n = a.length;
  const heapify = (size: number, i: number) => {
    while (true) {
      let lg = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < size) { c.cmp++; if (a[l] > a[lg]) lg = l; }
      if (r < size) { c.cmp++; if (a[r] > a[lg]) lg = r; }
      if (lg === i) return;
      swap(a, i, lg, c);
      i = lg;
    }
  };
  for (let i = (n >> 1) - 1; i >= 0; i--) heapify(n, i);
  for (let i = n - 1; i > 0; i--) { swap(a, 0, i, c); heapify(i, 0); }
};

export const LAB_ALGOS: { id: string; name: string; fn: Sorter; color: string }[] = [
  { id: 'bubble', name: 'Bubble', fn: bubble, color: 'var(--c1)' },
  { id: 'insertion', name: 'Insertion', fn: insertion, color: 'var(--c2)' },
  { id: 'selection', name: 'Selection', fn: selection, color: 'var(--c3)' },
  { id: 'merge', name: 'Merge', fn: merge, color: 'var(--c4)' },
  { id: 'quick', name: 'Quick', fn: quick, color: 'var(--c5)' },
  { id: 'heap', name: 'Heap', fn: heap, color: 'var(--c6)' },
];

export type Shape = 'random' | 'sorted' | 'reversed' | 'nearly';
export function makeInput(n: number, shape: Shape): number[] {
  const a = Array.from({ length: n }, () => Math.floor(Math.random() * n * 10));
  if (shape === 'random') return a;
  a.sort((x, y) => x - y);
  if (shape === 'reversed') a.reverse();
  if (shape === 'nearly') for (let k = 0; k < Math.max(1, n / 20); k++) {
    const i = Math.floor(Math.random() * n), j = Math.floor(Math.random() * n);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function measure(fn: Sorter, n: number, shape: Shape, trials: number): Counts & { ok: boolean } {
  let cmp = 0, mv = 0, ok = true;
  for (let t = 0; t < trials; t++) {
    const a = makeInput(n, shape);
    const c = { cmp: 0, mv: 0 };
    fn(a, c);
    for (let k = 1; k < n; k++) if (a[k - 1] > a[k]) ok = false;
    cmp += c.cmp; mv += c.mv;
  }
  return { cmp: cmp / trials, mv: mv / trials, ok };
}
