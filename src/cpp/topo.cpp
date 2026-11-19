vector<int> topoSort(vector<vector<int>>& adj) {
    int n = adj.size();
    vector<int> indeg(n, 0), order;
    for (int u = 0; u < n; u++)
        for (int v : adj[u]) indeg[v]++;         // @indeg
    queue<int> q;
    for (int u = 0; u < n; u++)
        if (indeg[u] == 0) q.push(u);            // @seed
    while (!q.empty()) {
        int u = q.front(); q.pop();              // @pop
        order.push_back(u);
        for (int v : adj[u])
            if (--indeg[v] == 0) q.push(v);      // @dec
    }
    if ((int)order.size() < n) return {};        // @cycle
    return order;                                // @done
}
