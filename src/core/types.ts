export type Frame<S> = { line: number; msg: string; state: S };
export type Vars = Record<string, string | number>;

export type Mark = 'cmp' | 'swap' | 'write' | 'pivot' | 'min' | 'key' | 'read' | 'found';

/** One call in a recursion tree. */
export interface CallNode { id: number; parent: number | null; label: string; done: boolean }

interface Base {
  vars: Vars;
  calls?: CallNode[];
  activeCall?: number | null;
}

export interface SortState extends Base {
  arr: number[];
  marks: Record<number, Mark>;
  sorted: number[];
  range?: [number, number];
  /** 'dim' greys out everything outside range (default); 'window' highlights the range instead. */
  rangeMode?: 'dim' | 'window';
  aux?: number[];
  auxLabel?: string;
}

export interface Graph {
  nodes: { x: number; y: number }[];
  /** [u, v, w]. Undirected algorithms ignore direction; topo sort reads it as u → v. */
  edges: [number, number, number][];
}

export interface GraphState extends Base {
  current: number | null;
  visited: number[];
  frontier: number[];
  frontierLabel: string;
  frontierItems: string[];
  activeEdge: [number, number] | null;
  treeEdges: [number, number][];
  rejectedEdges?: [number, number][];
  order: number[];
  dist?: (number | null)[];
  done: number[];
  info?: { label: string; items: string[] }[];
}

export type Cell = [number, number];
export interface DPState extends Base {
  table: (number | null)[][];
  rowHead: string[];
  colHead: string[];
  cur: Cell | null;
  deps: Cell[];
  path: Cell[];
  result?: string;
}

export interface TNode { id: number; val: number; left: number | null; right: number | null }
export interface TreeState extends Base {
  nodes: TNode[];
  root: number | null;
  current: number | null;
  path: number[];
  output: number[];
  fresh: number | null;
}

interface Meta {
  id: string;
  name: string;
  code: string[];
  time: string;
  space: string;
  note: string;
  /** Engine records a recursion tree (frames carry `calls`). */
  recursive?: boolean;
}

export interface StrInput { a: string; b: string }
export interface KnapInput { wt: number[]; val: number[]; W: number }
export interface SearchInput { arr: number[]; target: number }
export interface WindowInput { arr: number[]; k: number }
export interface GraphInput { graph: Graph; src: number }

export type Algo =
  | (Meta & { kind: 'sort'; run: (arr: number[]) => Frame<SortState>[] })
  | (Meta & { kind: 'search'; run: (inp: SearchInput) => Frame<SortState>[] })
  | (Meta & { kind: 'window'; run: (inp: WindowInput) => Frame<SortState>[] })
  | (Meta & { kind: 'graph'; weighted: boolean; directed?: boolean; run: (inp: GraphInput) => Frame<GraphState>[] })
  | (Meta & { kind: 'twoStr'; run: (inp: StrInput) => Frame<DPState>[] })
  | (Meta & { kind: 'knap'; run: (inp: KnapInput) => Frame<DPState>[] })
  | (Meta & { kind: 'lis'; run: (arr: number[]) => Frame<DPState>[] })
  | (Meta & { kind: 'tree'; run: (values: number[]) => Frame<TreeState>[] });

export type AlgoKind = Algo['kind'];
