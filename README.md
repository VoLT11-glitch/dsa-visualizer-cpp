# DSA Visualizer (C++)

Step through classic algorithms next to their **C++** implementation, see how their cost grows with n, and replay what **your own C++** did to a vector.

**Live:** https://dsa-visualizer-cpp.vercel.app

- **Visualize**: 15 algorithms with the current C++ line highlighted, plus play/pause, step forward/back, scrub and speed controls.
  - Sorting: bubble, insertion, selection, merge, quick (Lomuto), heap
  - Graphs: BFS, DFS, Dijkstra (on an 8-node weighted sample graph)
  - DP: LCS, 0/1 knapsack (the table fills cell by cell, then the answer is traced back)
  - Trees: BST insert, inorder / preorder / postorder
- **Complexity lab**: runs all six sorts on n = 10…4000 in the browser, counts comparisons and moves, and fits the counts to O(n), O(n log n) and O(n²). Try sorted input and see bubble and insertion drop to O(n) while quick sort climbs to O(n²).
- **Trace replay**: `cpp/tracked_vector.hpp` is a stand-in for `vector<int>` that logs every read, write, compare and swap, with source line numbers, to `trace.json`. Load that file to replay the run with your code highlighted.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Trace your own C++

```cpp
#include "tracked_vector.hpp"

TrackedVector<int> a = {5, 2, 9, 1};   // was: vector<int> a = {...};
bubbleSort(a);                          // your function takes TrackedVector<int>&
```

```bash
g++ -std=c++20 your.cpp -o your && ./your   # writes trace.json (or $TV_TRACE)
```

Then open **Trace replay**, load `trace.json` and, if you want line highlighting, your `.cpp`. See `cpp/examples/insertion_trace.cpp`.

Limits: elements must be arithmetic types, access must go through `operator[]` (no iterators or `std::sort`), and `auto x = a[i]` gives you a proxy, so write `int x = a[i]`. Logging stops after 200k ops (`-DTV_MAX_OPS=...` to change it).

## How it works

- Every C++ snippet in the UI is a real file in `src/cpp/` with `// @label` markers. The markers are stripped for display and mapped to line numbers. Each JS engine mirrors its snippet step for step and records a frame (state, message, line) per step.
- `npm run check:cpp` compiles every snippet with `g++ -fsyntax-only`.
- `npm run verify` runs every engine headlessly. It checks sorts against 200 random arrays each, plus graph reachability, the LCS and knapsack answers, the traversal orders, the lab's fitted classes and the example trace replay.

## Roadmap

- Phase 2: compile and run user C++ on growing n via Judge0, fit the curve, and compare two solutions.
- More traced containers and replay views beyond bars.
