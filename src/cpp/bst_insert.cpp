struct Node {
    int val;
    Node *left = nullptr, *right = nullptr;
    Node(int v) : val(v) {}
};

Node* insert(Node* root, int v) {
    if (!root) return new Node(v);               // @create
    if (v < root->val)                           // @cmp
        root->left = insert(root->left, v);      // @left
    else
        root->right = insert(root->right, v);    // @right
    return root;
}                                                // @done
