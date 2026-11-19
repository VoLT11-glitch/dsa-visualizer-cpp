void dfs(vector<vector<int>>& adj, int u,
         vector<bool>& visited, vector<int>& order) {
    visited[u] = true;                           // @visit
    order.push_back(u);
    for (int v : adj[u]) {
        if (!visited[v])                         // @check
            dfs(adj, v, visited, order);         // @recurse
    }
}                                                // @back
