void merge(vector<int>& a, int lo, int mid, int hi) {
    vector<int> tmp;
    int i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {                // @mcmp
        if (a[i] <= a[j]) tmp.push_back(a[i++]); // @takeL
        else tmp.push_back(a[j++]);              // @takeR
    }
    while (i <= mid) tmp.push_back(a[i++]);      // @restL
    while (j <= hi) tmp.push_back(a[j++]);       // @restR
    for (int k = lo; k <= hi; k++)
        a[k] = tmp[k - lo];                      // @copy
}

void mergeSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;                        // @base
    int mid = lo + (hi - lo) / 2;                // @split
    mergeSort(a, lo, mid);
    mergeSort(a, mid + 1, hi);
    merge(a, lo, mid, hi);                       // @merge
}                                                // @done
