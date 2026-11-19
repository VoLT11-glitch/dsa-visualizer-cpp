void inorder(Node* root, vector<int>& out) {
    if (!root) return;
    inorder(root->left, out);                    // @goleft
    out.push_back(root->val);                    // @visit
    inorder(root->right, out);                   // @goright
}                                                // @done
