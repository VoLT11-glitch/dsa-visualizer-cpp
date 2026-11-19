int maxWindowSum(vector<int>& a, int k) {
    int sum = 0;
    for (int i = 0; i < k; i++) sum += a[i];     // @init
    int best = sum;
    for (int r = k; r < (int)a.size(); r++) {
        sum += a[r] - a[r - k];                  // @slide
        best = max(best, sum);                   // @best
    }
    return best;                                 // @done
}
