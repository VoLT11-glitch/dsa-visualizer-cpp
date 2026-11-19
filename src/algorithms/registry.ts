import type { Algo } from '../core/types';
import { sortingAlgos } from './sorting';
import { graphAlgos } from './graph';
import { dpAlgos } from './dp';
import { treeAlgos } from './tree';
import { searchAlgos } from './search';

export const GROUPS: { title: string; algos: Algo[] }[] = [
  { title: 'Sorting', algos: sortingAlgos },
  { title: 'Searching', algos: searchAlgos },
  { title: 'Graphs', algos: graphAlgos },
  { title: 'Dynamic programming', algos: dpAlgos },
  { title: 'Trees', algos: treeAlgos },
];

export const ALL_ALGOS = GROUPS.flatMap((g) => g.algos);
export const findAlgo = (id: string) => ALL_ALGOS.find((a) => a.id === id);
