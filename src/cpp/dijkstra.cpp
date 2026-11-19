vector<int> dijkstra(vector<vector<pair<int,int>>>& adj, int src) {
    int n = adj.size();
    vector<int> dist(n, INT_MAX);
    priority_queue<pair<int,int>, vector<pair<int,int>>,
                   greater<pair<int,int>>> pq;
    dist[src] = 0;                               // @init
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();        // @pop
        if (d > dist[u]) continue;               // @stale
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {         // @relax
                dist[v] = dist[u] + w;           // @update
                pq.push({dist[v], v});
            }
        }
    }
    return dist;                                 // @done
}
