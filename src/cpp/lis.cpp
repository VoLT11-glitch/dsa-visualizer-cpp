int lis(vector<int>& a) {
    int n = a.size(), best = 0;
    vector<int> dp(n, 1);                        // @init
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < i; j++)
            if (a[j] < a[i])                     // @cmp
                dp[i] = max(dp[i], dp[j] + 1);   // @extend
        best = max(best, dp[i]);                 // @best
    }
    return best;                                 // @done
}
