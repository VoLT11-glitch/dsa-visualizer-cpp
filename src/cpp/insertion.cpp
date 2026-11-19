void insertionSort(vector<int>& a) {
    int n = a.size();
    for (int i = 1; i < n; i++) {                // @outer
        int key = a[i];                          // @key
        int j = i - 1;
        while (j >= 0 && a[j] > key) {           // @cmp
            a[j + 1] = a[j];                     // @shift
            j--;
        }
        a[j + 1] = key;                          // @place
    }
}                                                // @done
