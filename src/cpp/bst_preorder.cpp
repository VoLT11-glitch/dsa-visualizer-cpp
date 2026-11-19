void preorder(Node* root, vector<int>& out) {
    if (!root) return;
    out.push_back(root->val);                    // @visit
    preorder(root->left, out);                   // @goleft
    preorder(root->right, out);                  // @goright
}                                                // @done
