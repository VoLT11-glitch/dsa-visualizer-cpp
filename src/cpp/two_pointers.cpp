pair<int, int> pairWithSum(vector<int>& a, int target) {
    int i = 0, j = (int)a.size() - 1;
    while (i < j) {                              // @loop
        int s = a[i] + a[j];                     // @sum
        if (s == target) return {i, j};          // @found
        if (s < target) i++;                     // @inc
        else j--;                                // @dec
    }
    return {-1, -1};                             // @miss
}
