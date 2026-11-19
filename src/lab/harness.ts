export type Shape = 'random' | 'sorted' | 'reversed' | 'nearly';

/**
 * Wraps the user's `void solve(vector<int>& a)` in a timing harness. n doubles until the
 * time budget would be blown, so an O(n²) solution stops early instead of hitting the TLE.
 * `#line` keeps compiler errors pointing at the user's own line numbers.
 */
export function buildHarness(userCode: string, shape: Shape, n0: number, nMax: number, budget: number) {
  return `#include <bits/stdc++.h>
using namespace std;
#line 1 "solution.cpp"
${userCode}
#line 1 "harness.cpp"
int main() {
    using clk = chrono::steady_clock;
    mt19937 rng(12345);
    const string shape = "${shape}";
    const double budget = ${budget};
    auto t_start = clk::now();
    for (long long n = ${n0}; n <= ${nMax}; n *= 2) {
        vector<int> base(n);
        for (auto& x : base) x = (int)(rng() % (10 * n + 1));
        if (shape != "random") sort(base.begin(), base.end());
        if (shape == "reversed") reverse(base.begin(), base.end());
        if (shape == "nearly") for (long long k = 0; k < max(1LL, n / 20); k++) swap(base[rng() % n], base[rng() % n]);
        double el = 0; long long reps = 0;
        do {
            vector<int> a = base;
            auto s = clk::now();
            solve(a);
            el += chrono::duration<double>(clk::now() - s).count();
            reps++;
        } while (el < 0.02 && reps < 2000);
        double per = el / reps;
        printf("%lld %.10f\\n", n, per);
        fflush(stdout);
        double used = chrono::duration<double>(clk::now() - t_start).count();
        // Next n costs at least ~2x (more for superlinear); stop if it won't fit.
        if (used + max(per * 4, 0.02) * 1.5 > budget) break;
    }
}
`;
}

export function parseTimings(stdout: string) {
  return stdout.trim().split('\n').map((l) => l.trim().split(/\s+/).map(Number))
    .filter((p) => p.length === 2 && p.every(Number.isFinite)).map(([n, t]) => ({ n, t }));
}

export const PRESETS: { name: string; a: string; b: string }[] = [
  {
    name: 'Bubble sort vs std::sort',
    a: `void solve(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) swap(a[j], a[j + 1]);
}`,
    b: `void solve(vector<int>& a) {
    sort(a.begin(), a.end());
}`,
  },
  {
    name: 'Insertion sort vs merge sort',
    a: `void solve(vector<int>& a) {
    for (int i = 1; i < (int)a.size(); i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}`,
    b: `void mergeSort(vector<int>& a, vector<int>& tmp, int lo, int hi) {
    if (hi - lo < 1) return;
    int mid = (lo + hi) / 2;
    mergeSort(a, tmp, lo, mid);
    mergeSort(a, tmp, mid + 1, hi);
    merge(a.begin() + lo, a.begin() + mid + 1, a.begin() + mid + 1,
          a.begin() + hi + 1, tmp.begin() + lo);
    copy(tmp.begin() + lo, tmp.begin() + hi + 1, a.begin() + lo);
}

void solve(vector<int>& a) {
    vector<int> tmp(a.size());
    if (!a.empty()) mergeSort(a, tmp, 0, a.size() - 1);
}`,
  },
  {
    name: 'Count duplicates: nested loops vs hash set',
    a: `int sink;
void solve(vector<int>& a) {
    int dups = 0, n = a.size();
    for (int i = 0; i < n; i++)
        for (int j = 0; j < i; j++)
            if (a[i] == a[j]) { dups++; break; }
    sink = dups;
}`,
    b: `int sink;
void solve(vector<int>& a) {
    unordered_set<int> seen;
    int dups = 0;
    for (int x : a)
        if (!seen.insert(x).second) dups++;
    sink = dups;
}`,
  },
];
