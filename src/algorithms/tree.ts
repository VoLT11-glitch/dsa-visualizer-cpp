import { parseCpp, Recorder } from '../core/cpp';
import type { Algo, TNode, TreeState, Vars } from '../core/types';
import insertSrc from '../cpp/bst_insert.cpp?raw';
import inSrc from '../cpp/bst_inorder.cpp?raw';
import preSrc from '../cpp/bst_preorder.cpp?raw';
import postSrc from '../cpp/bst_postorder.cpp?raw';

/** Plain BST insert (duplicates go right, same as the C++). */
function buildTree(values: number[]) {
  const nodes: TNode[] = [];
  let root: number | null = null;
  for (const v of values) {
    const id = nodes.length;
    nodes.push({ id, val: v, left: null, right: null });
    if (root === null) {
      root = id;
      continue;
    }
    let cur = root;
    while (true) {
      const c = nodes[cur];
      if (v < c.val) {
        if (c.left === null) { c.left = id; break; }
        cur = c.left;
      } else {
        if (c.right === null) { c.right = id; break; }
        cur = c.right;
      }
    }
  }
  return { nodes, root };
}

function insertFrames(values: number[]) {
  const p = parseCpp(insertSrc);
  const r = new Recorder<TreeState>(p.labels);
  const s: TreeState = { nodes: [], root: null, current: null, path: [], output: [], fresh: null, vars: {} };
  const snap = (label: string, msg: string, vars: Vars) => {
    s.vars = vars;
    r.add(label, msg, s);
  };
  for (const v of values) {
    s.path = [];
    s.fresh = null;
    const id = s.nodes.length;
    let cur = s.root;
    let parent: TNode | null = null;
    let dir: 'left' | 'right' = 'left';
    while (cur !== null) {
      const c: TNode = s.nodes[cur];
      s.current = cur;
      s.path.push(cur);
      snap('cmp', `insert(${v}): is ${v} < ${c.val}?`, { v, 'root->val': c.val });
      if (v < c.val) {
        snap('left', `Yes → go left`, { v, 'root->val': c.val });
        parent = c;
        dir = 'left';
        cur = c.left;
      } else {
        snap('right', `No → go right`, { v, 'root->val': c.val });
        parent = c;
        dir = 'right';
        cur = c.right;
      }
    }
    s.nodes.push({ id, val: v, left: null, right: null });
    if (parent) parent[dir] = id;
    else s.root = id;
    s.current = id;
    s.fresh = id;
    snap('create', parent ? `Hit nullptr → new Node(${v}) becomes ${dir} child of ${parent.val}` : `Tree is empty → new Node(${v}) is the root`, { v });
  }
  s.current = null;
  s.path = [];
  s.fresh = null;
  snap('done', `Inserted ${values.length} values. An inorder walk of a BST gives them back sorted.`, {});
  return r.frames;
}

type Order = 'in' | 'pre' | 'post';
function traversal(order: Order, src: string) {
  return (values: number[]) => {
    const p = parseCpp(src);
    const r = new Recorder<TreeState>(p.labels);
    const { nodes, root } = buildTree(values);
    const s: TreeState = { nodes, root, current: null, path: [], output: [], fresh: null, vars: {} };
    const snap = (label: string, msg: string) => {
      s.vars = { out: `[${s.output.join(', ')}]` };
      r.add(label, msg, s);
    };
    const visit = (id: number) => {
      s.current = id;
      s.output.push(nodes[id].val);
      snap('visit', `Visit ${nodes[id].val} → out.push_back(${nodes[id].val})`);
    };
    const walk = (id: number | null) => {
      if (id === null) return;
      const n = nodes[id];
      s.path.push(id);
      s.current = id;
      if (order === 'pre') visit(id);
      s.current = id;
      snap('goleft', n.left === null ? `${n.val} has no left child` : `From ${n.val} go left to ${nodes[n.left].val}`);
      walk(n.left);
      s.current = id;
      if (order === 'in') visit(id);
      s.current = id;
      snap('goright', n.right === null ? `${n.val} has no right child` : `From ${n.val} go right to ${nodes[n.right].val}`);
      walk(n.right);
      s.current = id;
      if (order === 'post') visit(id);
      s.path.pop();
    };
    walk(root);
    s.current = null;
    snap('done', `${order === 'in' ? 'Inorder' : order === 'pre' ? 'Preorder' : 'Postorder'}: ${s.output.join(', ')}`);
    return r.frames;
  };
}

export const treeAlgos: Algo[] = [
  { kind: 'tree', id: 'bst-insert', name: 'BST insert', code: parseCpp(insertSrc).code, time: 'O(h) per insert', space: 'O(h) recursion', note: 'h = height: log n if balanced, n if you insert sorted data.', run: insertFrames },
  { kind: 'tree', id: 'inorder', name: 'Inorder traversal', code: parseCpp(inSrc).code, time: 'O(n)', space: 'O(h)', note: 'Left, node, right. On a BST this prints values in sorted order.', run: traversal('in', inSrc) },
  { kind: 'tree', id: 'preorder', name: 'Preorder traversal', code: parseCpp(preSrc).code, time: 'O(n)', space: 'O(h)', note: 'Node, left, right. Used to copy/serialize a tree.', run: traversal('pre', preSrc) },
  { kind: 'tree', id: 'postorder', name: 'Postorder traversal', code: parseCpp(postSrc).code, time: 'O(n)', space: 'O(h)', note: 'Left, right, node. Used to delete/free a tree.', run: traversal('post', postSrc) },
];
