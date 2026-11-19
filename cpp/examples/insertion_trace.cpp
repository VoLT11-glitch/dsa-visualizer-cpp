// Example: trace an ordinary insertion sort with TrackedVector.
//   g++ -std=c++20 insertion_trace.cpp -o insertion_trace && ./insertion_trace
// then load the generated trace.json on the Trace replay page.
#include <bits/stdc++.h>
#include "../tracked_vector.hpp"
using namespace std;

void insertionSort(TrackedVector<int>& a) {
    int n = a.size();
    for (int i = 1; i < n; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}

void bubbleSort(TrackedVector<int>& a) {
    int n = a.size();
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) swap(a[j], a[j + 1]);
}

int main() {
    TrackedVector<int> a = {38, 27, 43, 3, 9, 82, 10, 55};
    insertionSort(a);
    for (int x : a.raw()) cout << x << ' ';
    cout << '\n';

    TrackedVector<int> b({64, 25, 12, 22, 11, 90, 5}, "b");
    bubbleSort(b);
    for (int x : b.raw()) cout << x << ' ';
    cout << '\n';
}
