import { parseCpp, Recorder } from '../core/cpp';
import type { Algo, Cell, DPState, KnapInput, StrInput, Vars } from '../core/types';
import lcsSrc from '../cpp/lcs.cpp?raw';
import knapSrc from '../cpp/knapsack.cpp?raw';
import lisSrc from '../cpp/lis.cpp?raw';
import editSrc from '../cpp/edit_distance.cpp?raw';

function lcs({ a, b }: StrInput) {
  const p = parseCpp(lcsSrc);
  const r = new Recorder<DPState>(p.labels);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const shown: (number | null)[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null)),
  );
  const s: DPState = {
    table: shown, rowHead: ['∅', ...a], colHead: ['∅', ...b], cur: null, deps: [], path: [], vars: {},
  };
  const snap = (label: string, msg: string, cur: Cell | null, deps: Cell[], vars: Vars) => {
    s.cur = cur;
    s.deps = deps;
    s.vars = vars;
    r.add(label, msg, s);
  };
  snap('init', `dp is (${n}+1)×(${m}+1). Row 0 and column 0 are 0: LCS with an empty string is empty`, null, [], { n, m });
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const ca = a[i - 1];
      const cb = b[j - 1];
      snap('cmp', `Is a[${i - 1}]='${ca}' == b[${j - 1}]='${cb}'?`, [i, j], [], { i, j });
      if (ca === cb) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        shown[i][j] = dp[i][j];
        snap('match', `Match → dp[${i}][${j}] = dp[${i - 1}][${j - 1}] + 1 = ${dp[i][j]}`, [i, j], [[i - 1, j - 1]], { i, j });
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        shown[i][j] = dp[i][j];
        snap('nomatch', `No match → max(up=${dp[i - 1][j]}, left=${dp[i][j - 1]}) = ${dp[i][j]}`, [i, j], [[i - 1, j], [i, j - 1]], { i, j });
      }
    }
  }
  // Trace back one LCS so the answer is visible, not just its length.
  const path: Cell[] = [];
  let i = n;
  let j = m;
  let str = '';
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      path.push([i, j]);
      str = a[i - 1] + str;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  s.path = path;
  s.result = str;
  snap('done', `LCS length = dp[${n}][${m}] = ${dp[n][m]}. One LCS: "${str || '(empty)'}" (highlighted cells are the matches)`, [n, m], [], { answer: dp[n][m] });
  return r.frames;
}

function knapsack({ wt, val, W }: KnapInput) {
  const p = parseCpp(knapSrc);
  const r = new Recorder<DPState>(p.labels);
  const n = wt.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(W + 1).fill(0));
  const shown: (number | null)[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: W + 1 }, () => (i === 0 ? 0 : null)),
  );
  const s: DPState = {
    table: shown,
    rowHead: ['∅', ...wt.map((w, k) => `#${k + 1} (w${w}, v${val[k]})`)],
    colHead: Array.from({ length: W + 1 }, (_, w) => String(w)),
    cur: null, deps: [], path: [], vars: {},
  };
  const snap = (label: string, msg: string, cur: Cell | null, deps: Cell[], vars: Vars) => {
    s.cur = cur;
    s.deps = deps;
    s.vars = vars;
    r.add(label, msg, s);
  };
  snap('init', `dp[i][w] = best value using the first i items with capacity w. Row 0 = 0 (no items)`, null, [], { n, W });
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= W; w++) {
      dp[i][w] = dp[i - 1][w];
      shown[i][w] = dp[i][w];
      snap('skip', `Skip item ${i}: dp[${i}][${w}] = dp[${i - 1}][${w}] = ${dp[i][w]}`, [i, w], [[i - 1, w]], { i, w });
      const wi = wt[i - 1];
      const vi = val[i - 1];
      snap('fits', `Does item ${i} (weight ${wi}) fit in capacity ${w}? ${wi <= w ? 'Yes' : 'No'}`, [i, w], [], { i, w });
      if (wi <= w) {
        const take = dp[i - 1][w - wi] + vi;
        dp[i][w] = Math.max(dp[i][w], take);
        shown[i][w] = dp[i][w];
        snap('take', `Take it: dp[${i - 1}][${w - wi}] + ${vi} = ${take} vs skip ${dp[i - 1][w]} → ${dp[i][w]}`, [i, w], [[i - 1, w], [i - 1, w - wi]], { i, w });
      }
    }
  }
  const path: Cell[] = [];
  const chosen: number[] = [];
  let w = W;
  for (let i = n; i > 0; i--) {
    if (dp[i][w] !== dp[i - 1][w]) {
      path.push([i, w]);
      chosen.unshift(i);
      w -= wt[i - 1];
    }
  }
  s.path = path;
  s.result = chosen.length ? `items ${chosen.join(', ')}` : 'nothing';
  snap('done', `Best value = dp[${n}][${W}] = ${dp[n][W]}. Take ${s.result} (highlighted rows are where an item was taken)`, [n, W], [], { answer: dp[n][W] });
  return r.frames;
}


function lis(arr: number[]) {
  const p = parseCpp(lisSrc);
  const r = new Recorder<DPState>(p.labels);
  const a = arr.slice(0, 16);
  const n = a.length;
  const dp = Array(n).fill(1);
  const s: DPState = {
    table: [a.map((x) => x), a.map(() => null)], rowHead: ['a', 'dp'], colHead: a.map((_, i) => String(i)),
    cur: null, deps: [], path: [], vars: {},
  };
  let best = 0;
  const snap = (label: string, msg: string, cur: Cell | null, deps: Cell[], vars: Vars) => {
    s.table[1] = dp.map((v, k) => (k < curFilled ? v : label === 'init' ? 1 : null));
    s.cur = cur;
    s.deps = deps;
    s.vars = { best, ...vars };
    r.add(label, msg, s);
  };
  let curFilled = n;
  snap('init', `dp[i] = length of the longest increasing subsequence ending at i. Every element alone has length 1`, null, [], {});
  curFilled = 0;
  for (let i = 0; i < n; i++) {
    curFilled = i + 1;
    for (let j = 0; j < i; j++) {
      snap('cmp', `Can a[${i}]=${a[i]} extend the subsequence ending at a[${j}]=${a[j]}? ${a[j] < a[i] ? 'Yes' : 'No'} (${a[j]} ${a[j] < a[i] ? '<' : '≥'} ${a[i]})`, [1, i], [[0, j], [0, i]], { i, j });
      if (a[j] < a[i]) {
        const old = dp[i];
        dp[i] = Math.max(dp[i], dp[j] + 1);
        snap('extend', `dp[${i}] = max(${old}, dp[${j}] + 1 = ${dp[j] + 1}) = ${dp[i]}`, [1, i], [[1, j]], { i, j });
      }
    }
    best = Math.max(best, dp[i]);
    snap('best', `dp[${i}] = ${dp[i]} → best so far = ${best}`, [1, i], [], { i });
  }
  // Recover one LIS for display.
  const path: Cell[] = [];
  let need = best;
  let last = Infinity;
  for (let i = n - 1; i >= 0 && need > 0; i--) {
    if (dp[i] === need && a[i] < last) { path.unshift([1, i]); need--; last = a[i]; }
  }
  s.path = path;
  s.result = path.map(([, i]) => a[i]).join(', ');
  snap('done', `LIS length = ${best}. One LIS: ${s.result}`, null, [], { answer: best });
  return r.frames;
}

function editDistance({ a, b }: StrInput) {
  const p = parseCpp(editSrc);
  const r = new Recorder<DPState>(p.labels);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  const shown: (number | null)[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(null));
  const s: DPState = { table: shown, rowHead: ['∅', ...a], colHead: ['∅', ...b], cur: null, deps: [], path: [], vars: {} };
  const snap = (label: string, msg: string, cur: Cell | null, deps: Cell[], vars: Vars) => {
    s.cur = cur; s.deps = deps; s.vars = vars;
    r.add(label, msg, s);
  };
  for (let i = 0; i <= n; i++) { dp[i][0] = i; shown[i][0] = i; }
  for (let j = 0; j <= m; j++) { dp[0][j] = j; shown[0][j] = j; }
  snap('base', `Turning a prefix into the empty string takes i deletions (column 0); building b from nothing takes j inserts (row 0)`, null, [], { n, m });
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      snap('cmp', `Is a[${i - 1}]='${a[i - 1]}' == b[${j - 1}]='${b[j - 1]}'?`, [i, j], [], { i, j });
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
        shown[i][j] = dp[i][j];
        snap('same', `Same char → no edit needed: dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${dp[i][j]}`, [i, j], [[i - 1, j - 1]], { i, j });
      } else {
        const del = dp[i - 1][j], ins = dp[i][j - 1], rep = dp[i - 1][j - 1];
        dp[i][j] = 1 + Math.min(del, ins, rep);
        shown[i][j] = dp[i][j];
        snap('op', `Different → 1 + min(delete ${del}, insert ${ins}, replace ${rep}) = ${dp[i][j]}`, [i, j], [[i - 1, j], [i, j - 1], [i - 1, j - 1]], { i, j });
      }
    }
  }
  const path: Cell[] = [];
  const ops: string[] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    path.push([i, j]);
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) { i--; j--; }
    else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) { ops.unshift(`replace ${a[i - 1]}→${b[j - 1]}`); i--; j--; }
    else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) { ops.unshift(`delete ${a[i - 1]}`); i--; }
    else { ops.unshift(`insert ${b[j - 1]}`); j--; }
  }
  path.push([0, 0]);
  s.path = path;
  s.result = ops.join(', ') || 'nothing';
  snap('done', `Edit distance = ${dp[n][m]}: ${s.result}`, [n, m], [], { answer: dp[n][m] });
  return r.frames;
}

export const dpAlgos: Algo[] = [
  { kind: 'twoStr', id: 'lcs', name: 'Longest common subsequence', code: parseCpp(lcsSrc).code, time: 'O(n·m)', space: 'O(n·m)', note: 'Each cell looks at most at 3 neighbours: diagonal, up, left.', run: lcs },
  { kind: 'knap', id: 'knapsack', name: '0/1 knapsack', code: parseCpp(knapSrc).code, time: 'O(n·W)', space: 'O(n·W)', note: 'Pseudo-polynomial: cost grows with the capacity W, not just n.', run: knapsack },
  { kind: 'lis', id: 'lis', name: 'Longest increasing subsequence', code: parseCpp(lisSrc).code, time: 'O(n²)', space: 'O(n)', note: 'The classic O(n²) DP. (There is an O(n log n) version using binary search.)', run: lis },
  { kind: 'twoStr', id: 'edit-distance', name: 'Edit distance', code: parseCpp(editSrc).code, time: 'O(n·m)', space: 'O(n·m)', note: 'Minimum inserts, deletes and replaces to turn a into b (Levenshtein).', run: editDistance },
];
