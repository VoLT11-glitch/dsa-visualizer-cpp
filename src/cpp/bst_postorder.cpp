void postorder(Node* root, vector<int>& out) {
    if (!root) return;
    postorder(root->left, out);                  // @goleft
    postorder(root->right, out);                 // @goright
    out.push_back(root->val);                    // @visit
}                                                // @done
