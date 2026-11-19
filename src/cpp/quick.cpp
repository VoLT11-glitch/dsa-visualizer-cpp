int partition(vector<int>& a, int lo, int hi) {
    int pivot = a[hi];                           // @pivot
    int i = lo - 1;
    for (int j = lo; j < hi; j++) {
        if (a[j] < pivot) {                      // @cmp
            i++;
            swap(a[i], a[j]);                    // @swap
        }
    }
    swap(a[i + 1], a[hi]);                       // @place
    return i + 1;
}

void quickSort(vector<int>& a, int lo, int hi) {
    if (lo >= hi) return;                        // @base
    int p = partition(a, lo, hi);                // @part
    quickSort(a, lo, p - 1);
    quickSort(a, p + 1, hi);
}                                                // @done
