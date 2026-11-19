int find(vector<int>& p, int x) {
    while (p[x] != x) x = p[x] = p[p[x]];        // @find
    return x;
}

int kruskal(int n, vector<array<int, 3>>& edges) {
    sort(edges.begin(), edges.end(),
         [](auto& a, auto& b) { return a[2] < b[2]; }); // @sort
    vector<int> p(n);
    iota(p.begin(), p.end(), 0);                 // @init
    int total = 0;
    for (auto& [u, v, w] : edges) {
        int ru = find(p, u), rv = find(p, v);    // @roots
        if (ru == rv) continue;                  // @skip
        p[ru] = rv;                              // @union
        total += w;
    }
    return total;                                // @done
}
