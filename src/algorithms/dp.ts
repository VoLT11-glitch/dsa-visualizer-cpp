import { parseCpp, Recorder } from '../core/cpp';
import type { Algo, Cell, DPState, KnapInput, LcsInput, Vars } from '../core/types';
import lcsSrc from '../cpp/lcs.cpp?raw';
import knapSrc from '../cpp/knapsack.cpp?raw';

function lcs({ a, b }: LcsInput) {
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

export const dpAlgos: Algo[] = [
  { kind: 'lcs', id: 'lcs', name: 'Longest common subsequence', code: parseCpp(lcsSrc).code, time: 'O(n·m)', space: 'O(n·m)', note: 'Each cell looks at most at 3 neighbours: diagonal, up, left.', run: lcs },
  { kind: 'knap', id: 'knapsack', name: '0/1 knapsack', code: parseCpp(knapSrc).code, time: 'O(n·W)', space: 'O(n·W)', note: 'Pseudo-polynomial: cost grows with the capacity W, not just n.', run: knapsack },
];
