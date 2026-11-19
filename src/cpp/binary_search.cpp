int binarySearch(vector<int>& a, int target) {
    int lo = 0, hi = (int)a.size() - 1;
    while (lo <= hi) {                           // @loop
        int mid = lo + (hi - lo) / 2;            // @mid
        if (a[mid] == target) return mid;        // @found
        if (a[mid] < target) lo = mid + 1;       // @right
        else hi = mid - 1;                       // @left
    }
    return -1;                                   // @miss
}
