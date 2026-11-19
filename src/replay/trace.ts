import type { Mark, SortState } from '../core/types';

export type TraceOp = { t: 'r' | 'w' | 'c' | 's' | 'p' | 'o'; v: number; i: number; j?: number; x?: number; line?: number };
export type Trace = { truncated?: boolean; vectors: { id: number; name: string; init: number[] }[]; ops: TraceOp[] };

export function parseTrace(text: string): Trace {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON. Load the trace.json written by tracked_vector.hpp.');
  }
  const t = raw as Partial<Trace>;
  if (!t || !Array.isArray(t.vectors) || !Array.isArray(t.ops)) throw new Error('Missing "vectors" or "ops" — is this a TrackedVector trace?');
  for (const v of t.vectors) if (!Array.isArray(v.init)) throw new Error(`Vector ${v.name ?? v.id} has no "init" array`);
  for (const o of t.ops) if (typeof o.t !== 'string' || typeof o.i !== 'number') throw new Error('Malformed op in "ops"');
  return t as Trace;
}

type Counts = { reads: number; writes: number; compares: number; swaps: number };
type Snap = { arr: number[]; c: Counts };
const EVERY = 256;

/** Replays the ops of one vector. Checkpoints every 256 ops so seeking stays cheap for big traces. */
export class Replay {
  readonly ops: TraceOp[];
  readonly name: string;
  private snaps: Snap[] = [];
  constructor(trace: Trace, vecId: number) {
    const v = trace.vectors.find((x) => x.id === vecId) ?? trace.vectors[0];
    this.name = v.name;
    this.ops = trace.ops.filter((o) => o.v === v.id);
    const cur: Snap = { arr: [...v.init], c: { reads: 0, writes: 0, compares: 0, swaps: 0 } };
    this.snaps.push(clone(cur));
    for (let k = 0; k < this.ops.length; k++) {
      apply(cur, this.ops[k]);
      if ((k + 1) % EVERY === 0) this.snaps.push(clone(cur));
    }
  }
  get count() {
    return this.ops.length + 1;
  }
  /** Frame k = state after the first k ops. */
  frame(k: number): { line: number; msg: string; state: SortState } {
    const base = Math.floor(k / EVERY);
    const cur = clone(this.snaps[base]);
    for (let q = base * EVERY; q < k; q++) apply(cur, this.ops[q]);
    const op = k > 0 ? this.ops[k - 1] : null;
    const marks: Record<number, Mark> = {};
    let msg = `Initial ${this.name} (${cur.arr.length} elements). ${this.ops.length} ops recorded.`;
    const n = this.name;
    if (op) {
      const at = (i: number) => cur.arr[i];
      switch (op.t) {
        case 'r': marks[op.i] = 'read'; msg = `read ${n}[${op.i}] → ${op.x ?? at(op.i)}`; break;
        case 'w': marks[op.i] = 'write'; msg = `${n}[${op.i}] = ${op.x}`; break;
        case 's': marks[op.i] = 'swap'; marks[op.j!] = 'swap'; msg = `swap(${n}[${op.i}], ${n}[${op.j}]) → ${at(op.i)}, ${at(op.j!)}`; break;
        case 'p': marks[op.i] = 'write'; msg = `${n}.push_back(${op.x})`; break;
        case 'o': msg = `${n}.pop_back()`; break;
        case 'c':
          marks[op.i] = 'cmp';
          if (op.j !== undefined && op.j >= 0) { marks[op.j] = 'cmp'; msg = `compare ${n}[${op.i}]=${at(op.i)} with ${n}[${op.j}]=${at(op.j)}`; }
          else msg = `compare ${n}[${op.i}]=${at(op.i)} with value ${op.x}`;
          break;
      }
    }
    return {
      line: op?.line ?? 0,
      msg,
      state: { arr: cur.arr, marks, sorted: [], vars: { ...cur.c } },
    };
  }
}

const clone = (s: Snap): Snap => ({ arr: [...s.arr], c: { ...s.c } });
function apply(s: Snap, o: TraceOp) {
  switch (o.t) {
    case 'r': s.c.reads++; break;
    case 'w': s.arr[o.i] = o.x ?? 0; s.c.writes++; break;
    case 'c': s.c.compares++; break;
    case 's': { const j = o.j ?? o.i; [s.arr[o.i], s.arr[j]] = [s.arr[j], s.arr[o.i]]; s.c.swaps++; break; }
    case 'p': s.arr.push(o.x ?? 0); s.c.writes++; break;
    case 'o': s.arr.pop(); break;
  }
}
