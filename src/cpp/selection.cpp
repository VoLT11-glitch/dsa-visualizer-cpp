void selectionSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++) {            // @outer
        int minIdx = i;
        for (int j = i + 1; j < n; j++) {
            if (a[j] < a[minIdx])                // @cmp
                minIdx = j;                      // @newmin
        }
        swap(a[i], a[minIdx]);                   // @swap
    }
}                                                // @done
