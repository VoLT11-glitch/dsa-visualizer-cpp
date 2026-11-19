vector<int> bfs(vector<vector<int>>& adj, int src) {
    int n = adj.size();
    vector<bool> visited(n, false);
    vector<int> order;
    queue<int> q;
    visited[src] = true;                         // @init
    q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();              // @pop
        order.push_back(u);
        for (int v : adj[u]) {
            if (!visited[v]) {                   // @check
                visited[v] = true;               // @visit
                q.push(v);
            }
        }
    }
    return order;                                // @done
}
