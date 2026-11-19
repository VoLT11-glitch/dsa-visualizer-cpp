export type Frame<S> = { line: number; msg: string; state: S };
export type Vars = Record<string, string | number>;

export type Mark = 'cmp' | 'swap' | 'write' | 'pivot' | 'min' | 'key' | 'read';

export interface SortState {
  arr: number[];
  marks: Record<number, Mark>;
  sorted: number[];
  range?: [number, number];
  aux?: number[];
  auxLabel?: string;
  vars: Vars;
}

export interface GraphState {
  current: number | null;
  visited: number[];
  frontier: number[];
  frontierLabel: string;
  frontierItems: string[];
  activeEdge: [number, number] | null;
  treeEdges: [number, number][];
  order: number[];
  dist?: (number | null)[];
  done: number[];
  vars: Vars;
}

export type Cell = [number, number];
export interface DPState {
  table: (number | null)[][];
  rowHead: string[];
  colHead: string[];
  cur: Cell | null;
  deps: Cell[];
  path: Cell[];
  vars: Vars;
  result?: string;
}

export interface TNode { id: number; val: number; left: number | null; right: number | null }
export interface TreeState {
  nodes: TNode[];
  root: number | null;
  current: number | null;
  path: number[];
  output: number[];
  fresh: number | null;
  vars: Vars;
}

interface Meta {
  id: string;
  name: string;
  code: string[];
  time: string;
  space: string;
  note: string;
}

export interface LcsInput { a: string; b: string }
export interface KnapInput { wt: number[]; val: number[]; W: number }

export type Algo =
  | (Meta & { kind: 'sort'; run: (arr: number[]) => Frame<SortState>[] })
  | (Meta & { kind: 'graph'; weighted: boolean; run: (src: number) => Frame<GraphState>[] })
  | (Meta & { kind: 'lcs'; run: (inp: LcsInput) => Frame<DPState>[] })
  | (Meta & { kind: 'knap'; run: (inp: KnapInput) => Frame<DPState>[] })
  | (Meta & { kind: 'tree'; run: (values: number[]) => Frame<TreeState>[] });

export type AlgoKind = Algo['kind'];
