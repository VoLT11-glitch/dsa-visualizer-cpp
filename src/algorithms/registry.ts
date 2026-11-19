import type { Algo } from '../core/types';
import { sortingAlgos } from './sorting';
import { graphAlgos } from './graph';
import { dpAlgos } from './dp';
import { treeAlgos } from './tree';

export const GROUPS: { title: string; algos: Algo[] }[] = [
  { title: 'Sorting', algos: sortingAlgos },
  { title: 'Graphs', algos: graphAlgos },
  { title: 'Dynamic programming', algos: dpAlgos },
  { title: 'Trees', algos: treeAlgos },
];

export const ALL_ALGOS = GROUPS.flatMap((g) => g.algos);
export const findAlgo = (id: string) => ALL_ALGOS.find((a) => a.id === id);
