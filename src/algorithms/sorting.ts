import { parseCpp, Recorder } from '../core/cpp';
import type { Algo, Mark, SortState, Vars } from '../core/types';
import bubbleSrc from '../cpp/bubble.cpp?raw';
import insertionSrc from '../cpp/insertion.cpp?raw';
import selectionSrc from '../cpp/selection.cpp?raw';
import mergeSrc from '../cpp/merge.cpp?raw';
import quickSrc from '../cpp/quick.cpp?raw';
import heapSrc from '../cpp/heap.cpp?raw';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Small helper so each algorithm reads close to its C++ twin. */
function session(src: string, input: number[]) {
  const p = parseCpp(src);
  const r = new Recorder<SortState>(p.labels);
  const a = [...input];
  const sorted = new Set<number>();
  const snap = (label: string, msg: string, marks: Record<number, Mark> = {}, vars: Vars = {}, extra: Partial<SortState> = {}) =>
    r.add(label, msg, { arr: a, marks, sorted: [...sorted], vars, ...extra });
  return { code: p.code, r, a, sorted, snap };
}

function bubble(input: number[]) {
  const { r, a, sorted, snap } = session(bubbleSrc, input);
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    snap('outer', `Pass ${i + 1}: push the largest of a[0..${n - 1 - i}] to the end`, {}, { i });
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      snap('cmp', `Is a[${j}]=${a[j]} > a[${j + 1}]=${a[j + 1]}?`, { [j]: 'cmp', [j + 1]: 'cmp' }, { i, j });
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        snap('swap', `Yes → swap. a[${j + 1}] is now ${a[j + 1]}`, { [j]: 'swap', [j + 1]: 'swap' }, { i, j });
      }
    }
    sorted.add(n - 1 - i);
    if (!swapped) {
      range(n).forEach((k) => sorted.add(k));
      snap('early', 'No swaps in this pass → array is already sorted, break early', {}, { i });
      break;
    }
  }
  range(n).forEach((k) => sorted.add(k));
  snap('done', 'Sorted.');
  return r.frames;
}

function insertion(input: number[]) {
  const { r, a, sorted, snap } = session(insertionSrc, input);
  const n = a.length;
  sorted.add(0);
  for (let i = 1; i < n; i++) {
    snap('outer', `a[0..${i - 1}] is sorted. Insert a[${i}] into it`, {}, { i });
    const key = a[i];
    snap('key', `key = a[${i}] = ${key}`, { [i]: 'key' }, { i, key });
    let j = i - 1;
    while (true) {
      if (j < 0) {
        snap('cmp', `j = -1 → reached the front, stop`, {}, { i, j, key });
        break;
      }
      snap('cmp', `Is a[${j}]=${a[j]} > key=${key}?`, { [j]: 'cmp', [j + 1]: 'key' }, { i, j, key });
      if (!(a[j] > key)) break;
      a[j + 1] = a[j];
      snap('shift', `Yes → shift ${a[j]} right to a[${j + 1}]`, { [j + 1]: 'write' }, { i, j, key });
      j--;
    }
    a[j + 1] = key;
    for (let k = 0; k <= i; k++) sorted.add(k);
    snap('place', `Drop key=${key} at a[${j + 1}]`, { [j + 1]: 'write' }, { i, j, key });
  }
  range(n).forEach((k) => sorted.add(k));
  snap('done', 'Sorted.');
  return r.frames;
}

function selection(input: number[]) {
  const { r, a, sorted, snap } = session(selectionSrc, input);
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    snap('outer', `Find the minimum of a[${i}..${n - 1}]; start with minIdx = ${i}`, { [i]: 'min' }, { i, minIdx });
    for (let j = i + 1; j < n; j++) {
      snap('cmp', `Is a[${j}]=${a[j]} < a[minIdx]=${a[minIdx]}?`, { [minIdx]: 'min', [j]: 'cmp' }, { i, j, minIdx });
      if (a[j] < a[minIdx]) {
        minIdx = j;
        snap('newmin', `Yes → minIdx = ${j}`, { [minIdx]: 'min' }, { i, j, minIdx });
      }
    }
    [a[i], a[minIdx]] = [a[minIdx], a[i]];
    sorted.add(i);
    snap('swap', `Swap a[${i}] and a[${minIdx}] → ${a[i]} is in its final spot`, { [i]: 'swap', [minIdx]: 'swap' }, { i, minIdx });
  }
  range(n).forEach((k) => sorted.add(k));
  snap('done', 'Sorted.');
  return r.frames;
}

function mergeSortFrames(input: number[]) {
  const { r, a, sorted, snap } = session(mergeSrc, input);
  const n = a.length;
  const merge = (lo: number, mid: number, hi: number) => {
    const tmp: number[] = [];
    let i = lo;
    let j = mid + 1;
    const ex = (): Partial<SortState> => ({ range: [lo, hi], aux: [...tmp], auxLabel: 'tmp' });
    while (i <= mid && j <= hi) {
      snap('mcmp', `Compare left a[${i}]=${a[i]} with right a[${j}]=${a[j]}`, { [i]: 'cmp', [j]: 'cmp' }, { lo, mid, hi, i, j }, ex());
      if (a[i] <= a[j]) {
        tmp.push(a[i++]);
        snap('takeL', `${tmp[tmp.length - 1]} ≤ → take from left`, { [i - 1]: 'read' }, { lo, mid, hi, i, j }, ex());
      } else {
        tmp.push(a[j++]);
        snap('takeR', `right is smaller → take ${tmp[tmp.length - 1]}`, { [j - 1]: 'read' }, { lo, mid, hi, i, j }, ex());
      }
    }
    while (i <= mid) {
      tmp.push(a[i++]);
      snap('restL', `Right half used up → copy leftover ${tmp[tmp.length - 1]}`, { [i - 1]: 'read' }, { lo, mid, hi, i, j }, ex());
    }
    while (j <= hi) {
      tmp.push(a[j++]);
      snap('restR', `Left half used up → copy leftover ${tmp[tmp.length - 1]}`, { [j - 1]: 'read' }, { lo, mid, hi, i, j }, ex());
    }
    for (let k = lo; k <= hi; k++) {
      a[k] = tmp[k - lo];
      if (lo === 0 && hi === n - 1) sorted.add(k);
      snap('copy', `a[${k}] = tmp[${k - lo}] = ${a[k]}`, { [k]: 'write' }, { lo, hi, k }, ex());
    }
  };
  const ms = (lo: number, hi: number) => {
    if (lo >= hi) {
      snap('base', `Range [${lo}..${hi}] has ≤ 1 element → already sorted`, {}, { lo, hi }, { range: [lo, Math.max(lo, hi)] });
      return;
    }
    const mid = lo + Math.floor((hi - lo) / 2);
    snap('split', `Split [${lo}..${hi}] into [${lo}..${mid}] and [${mid + 1}..${hi}]`, {}, { lo, mid, hi }, { range: [lo, hi] });
    ms(lo, mid);
    ms(mid + 1, hi);
    snap('merge', `Merge sorted halves [${lo}..${mid}] and [${mid + 1}..${hi}]`, {}, { lo, mid, hi }, { range: [lo, hi] });
    merge(lo, mid, hi);
  };
  ms(0, n - 1);
  range(n).forEach((k) => sorted.add(k));
  snap('done', 'Sorted.');
  return r.frames;
}

function quick(input: number[]) {
  const { r, a, sorted, snap } = session(quickSrc, input);
  const n = a.length;
  const partition = (lo: number, hi: number) => {
    const pivot = a[hi];
    const ex: Partial<SortState> = { range: [lo, hi] };
    snap('pivot', `pivot = a[${hi}] = ${pivot} (last element)`, { [hi]: 'pivot' }, { lo, hi, pivot }, ex);
    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      snap('cmp', `Is a[${j}]=${a[j]} < pivot=${pivot}?`, { [hi]: 'pivot', [j]: 'cmp' }, { lo, hi, pivot, i, j }, ex);
      if (a[j] < pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
        snap('swap', `Yes → i = ${i}, swap a[${i}] and a[${j}]`, { [hi]: 'pivot', [i]: 'swap', [j]: 'swap' }, { lo, hi, pivot, i, j }, ex);
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    sorted.add(i + 1);
    snap('place', `Put pivot at a[${i + 1}] — everything left is smaller, right is ≥`, { [i + 1]: 'swap', [hi]: 'swap' }, { lo, hi, pivot, i }, ex);
    return i + 1;
  };
  const qs = (lo: number, hi: number) => {
    if (lo >= hi) {
      if (lo === hi) sorted.add(lo);
      snap('base', `Range [${lo}..${hi}] has ≤ 1 element → done`, {}, { lo, hi });
      return;
    }
    snap('part', `Partition a[${lo}..${hi}]`, {}, { lo, hi }, { range: [lo, hi] });
    const p = partition(lo, hi);
    qs(lo, p - 1);
    qs(p + 1, hi);
  };
  qs(0, n - 1);
  range(n).forEach((k) => sorted.add(k));
  snap('done', 'Sorted.');
  return r.frames;
}

function heap(input: number[]) {
  const { r, a, sorted, snap } = session(heapSrc, input);
  const n = a.length;
  const heapify = (size: number, i: number) => {
    let largest = i;
    const l = 2 * i + 1;
    const rr = 2 * i + 2;
    const ex: Partial<SortState> = { range: [0, size - 1] };
    snap('hstart', `heapify(i=${i}): children are ${l < size ? l : '—'} and ${rr < size ? rr : '—'}`, { [i]: 'min' }, { n: size, i, l, r: rr }, ex);
    if (l < size) {
      snap('cmpL', `Is left a[${l}]=${a[l]} > a[largest]=${a[largest]}?`, { [l]: 'cmp', [largest]: 'cmp' }, { n: size, i, l, largest }, ex);
      if (a[l] > a[largest]) largest = l;
    }
    if (rr < size) {
      snap('cmpR', `Is right a[${rr}]=${a[rr]} > a[largest]=${a[largest]}?`, { [rr]: 'cmp', [largest]: 'cmp' }, { n: size, i, r: rr, largest }, ex);
      if (a[rr] > a[largest]) largest = rr;
    }
    if (largest !== i) {
      [a[i], a[largest]] = [a[largest], a[i]];
      snap('hswap', `Child is bigger → swap a[${i}] and a[${largest}], keep sifting down`, { [i]: 'swap', [largest]: 'swap' }, { n: size, i, largest }, ex);
      heapify(size, largest);
    }
  };
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    snap('build', `Build max-heap: heapify node ${i}`, {}, { i }, { range: [0, n - 1] });
    heapify(n, i);
  }
  for (let i = n - 1; i > 0; i--) {
    [a[0], a[i]] = [a[i], a[0]];
    sorted.add(i);
    snap('eswap', `Max (${a[i]}) goes to the end: swap a[0] and a[${i}]; heap shrinks to ${i}`, { 0: 'swap', [i]: 'swap' }, { i }, { range: [0, i - 1] });
    heapify(i, 0);
  }
  range(n).forEach((k) => sorted.add(k));
  snap('done', 'Sorted.');
  return r.frames;
}

const meta = (src: string) => parseCpp(src).code;

export const sortingAlgos: Algo[] = [
  { kind: 'sort', id: 'bubble', name: 'Bubble sort', code: meta(bubbleSrc), time: 'O(n²) · best O(n)', space: 'O(1)', note: 'Stable. Early exit makes already-sorted input linear.', run: bubble },
  { kind: 'sort', id: 'insertion', name: 'Insertion sort', code: meta(insertionSrc), time: 'O(n²) · best O(n)', space: 'O(1)', note: 'Stable. Great on small or nearly-sorted arrays.', run: insertion },
  { kind: 'sort', id: 'selection', name: 'Selection sort', code: meta(selectionSrc), time: 'O(n²) always', space: 'O(1)', note: 'Not stable. At most n−1 swaps.', run: selection },
  { kind: 'sort', id: 'merge', name: 'Merge sort', code: meta(mergeSrc), time: 'O(n log n)', space: 'O(n)', note: 'Stable. Call as mergeSort(a, 0, n - 1).', run: mergeSortFrames },
  { kind: 'sort', id: 'quick', name: 'Quick sort', code: meta(quickSrc), time: 'O(n log n) avg · O(n²) worst', space: 'O(log n) stack', note: 'Lomuto partition, last element as pivot. Sorted input is the worst case.', run: quick },
  { kind: 'sort', id: 'heap', name: 'Heap sort', code: meta(heapSrc), time: 'O(n log n)', space: 'O(1)', note: 'Not stable. Builds a max-heap, then extracts the max n−1 times.', run: heap },
];
