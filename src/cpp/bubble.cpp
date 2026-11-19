void bubbleSort(vector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++) {            // @outer
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; j++) {
            if (a[j] > a[j + 1]) {               // @cmp
                swap(a[j], a[j + 1]);            // @swap
                swapped = true;
            }
        }
        if (!swapped) break;                     // @early
    }
}                                                // @done
