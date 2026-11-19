void heapify(vector<int>& a, int n, int i) {
    int largest = i;                             // @hstart
    int l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && a[l] > a[largest]) largest = l; // @cmpL
    if (r < n && a[r] > a[largest]) largest = r; // @cmpR
    if (largest != i) {
        swap(a[i], a[largest]);                  // @hswap
        heapify(a, n, largest);
    }
}

void heapSort(vector<int>& a) {
    int n = a.size();
    for (int i = n / 2 - 1; i >= 0; i--)         // @build
        heapify(a, n, i);
    for (int i = n - 1; i > 0; i--) {
        swap(a[0], a[i]);                        // @eswap
        heapify(a, i, 0);
    }
}                                                // @done
