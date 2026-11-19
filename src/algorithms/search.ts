import { parseCpp, Recorder } from '../core/cpp';
import type { Algo, Mark, SearchInput, SortState, Vars, WindowInput } from '../core/types';
import bsSrc from '../cpp/binary_search.cpp?raw';
import tpSrc from '../cpp/two_pointers.cpp?raw';
import swSrc from '../cpp/sliding_window.cpp?raw';

const sortedCopy = (a: number[]) => [...a].sort((x, y) => x - y);

function binarySearch({ arr, target }: SearchInput) {
  const p = parseCpp(bsSrc);
  const r = new Recorder<SortState>(p.labels);
  const a = sortedCopy(arr);
  const snap = (label: string, msg: string, marks: Record<number, Mark>, vars: Vars, range?: [number, number], sorted: number[] = []) =>
    r.add(label, msg, { arr: a, marks, sorted, vars, range });
  let lo = 0;
  let hi = a.length - 1;
  while (true) {
    if (lo > hi) {
      snap('loop', `lo=${lo} > hi=${hi} → search space is empty`, {}, { lo, hi, target });
      break;
    }
    snap('loop', `Search space a[${lo}..${hi}] (${hi - lo + 1} elements)`, {}, { lo, hi, target }, [lo, hi]);
    const mid = lo + Math.floor((hi - lo) / 2);
    snap('mid', `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}, a[mid] = ${a[mid]}`, { [mid]: 'cmp' }, { lo, hi, mid, target }, [lo, hi]);
    if (a[mid] === target) {
      snap('found', `a[${mid}] == ${target} → found at index ${mid}`, { [mid]: 'found' }, { lo, hi, mid, target }, [lo, hi], [mid]);
      return r.frames;
    }
    if (a[mid] < target) {
      lo = mid + 1;
      snap('right', `${a[mid]} < ${target} → answer is to the right, lo = ${lo}`, { [mid]: 'swap' }, { lo, hi, mid, target }, [Math.min(lo, hi), hi]);
    } else {
      hi = mid - 1;
      snap('left', `${a[mid]} > ${target} → answer is to the left, hi = ${hi}`, { [mid]: 'swap' }, { lo, hi, mid, target }, [lo, Math.max(lo, hi)]);
    }
  }
  snap('miss', `${target} is not in the array → return -1`, {}, { target });
  return r.frames;
}

function twoPointers({ arr, target }: SearchInput) {
  const p = parseCpp(tpSrc);
  const r = new Recorder<SortState>(p.labels);
  const a = sortedCopy(arr);
  const snap = (label: string, msg: string, marks: Record<number, Mark>, vars: Vars, range?: [number, number], sorted: number[] = []) =>
    r.add(label, msg, { arr: a, marks, sorted, vars, range });
  let i = 0;
  let j = a.length - 1;
  while (true) {
    if (!(i < j)) {
      snap('loop', `i=${i} ≥ j=${j} → pointers met`, {}, { i, j, target });
      break;
    }
    snap('loop', `i=${i}, j=${j}`, { [i]: 'key', [j]: 'key' }, { i, j, target }, [i, j]);
    const s = a[i] + a[j];
    snap('sum', `a[${i}] + a[${j}] = ${a[i]} + ${a[j]} = ${s}`, { [i]: 'cmp', [j]: 'cmp' }, { i, j, s, target }, [i, j]);
    if (s === target) {
      snap('found', `${s} == ${target} → pair found: (${i}, ${j})`, { [i]: 'found', [j]: 'found' }, { i, j, s, target }, [i, j], [i, j]);
      return r.frames;
    }
    if (s < target) {
      i++;
      snap('inc', `${s} < ${target} → need bigger, move i right`, { [i]: 'key', [j]: 'key' }, { i, j, s, target }, [i, j]);
    } else {
      j--;
      snap('dec', `${s} > ${target} → need smaller, move j left`, { [i]: 'key', [j]: 'key' }, { i, j, s, target }, [i, j]);
    }
  }
  snap('miss', `No pair sums to ${target} → return {-1, -1}`, {}, { target });
  return r.frames;
}

function slidingWindow({ arr, k: kIn }: WindowInput) {
  const p = parseCpp(swSrc);
  const r = new Recorder<SortState>(p.labels);
  const a = [...arr];
  const k = Math.max(1, Math.min(kIn, a.length));
  const win = (l: number, rr: number): Partial<SortState> => ({ range: [l, rr], rangeMode: 'window' });
  const snap = (label: string, msg: string, marks: Record<number, Mark>, vars: Vars, extra: Partial<SortState> = {}, sorted: number[] = []) =>
    r.add(label, msg, { arr: a, marks, sorted, vars, ...extra });
  let sum = 0;
  for (let i = 0; i < k; i++) {
    sum += a[i];
    snap('init', `Build the first window: sum += a[${i}] → ${sum}`, { [i]: 'read' }, { k, i, sum }, win(0, i));
  }
  let best = sum;
  let bestL = 0;
  for (let rr = k; rr < a.length; rr++) {
    sum += a[rr] - a[rr - k];
    snap('slide', `Slide: add a[${rr}]=${a[rr]}, drop a[${rr - k}]=${a[rr - k]} → sum = ${sum}`, { [rr]: 'write', [rr - k]: 'swap' }, { k, r: rr, sum, best }, win(rr - k + 1, rr));
    const better = sum > best;
    if (better) { best = sum; bestL = rr - k + 1; }
    snap('best', better ? `${sum} beats the best so far → best = ${best}` : `${sum} ≤ best (${best}), keep it`, {}, { k, r: rr, sum, best }, win(rr - k + 1, rr));
  }
  const bestIdx = Array.from({ length: k }, (_, t) => bestL + t);
  snap('done', `Max sum of ${k} consecutive elements = ${best} (a[${bestL}..${bestL + k - 1}])`, {}, { k, best }, win(bestL, bestL + k - 1), bestIdx);
  return r.frames;
}

export const searchAlgos: Algo[] = [
  { kind: 'search', id: 'binary-search', name: 'Binary search', code: parseCpp(bsSrc).code, time: 'O(log n)', space: 'O(1)', note: 'Needs a sorted array (your input is sorted first). Halves the search space every step.', run: binarySearch },
  { kind: 'search', id: 'two-pointers', name: 'Two pointers (pair sum)', code: parseCpp(tpSrc).code, time: 'O(n)', space: 'O(1)', note: 'On a sorted array, move the pointer that makes the sum go the right way.', run: twoPointers },
  { kind: 'window', id: 'sliding-window', name: 'Sliding window (max sum)', code: parseCpp(swSrc).code, time: 'O(n)', space: 'O(1)', note: 'Reuse the previous window: add the new element, drop the old one. No re-summing.', run: slidingWindow },
];
