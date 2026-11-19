import type { Frame } from './types';

const MARKER = /\s*\/\/ @(\w+)\s*$/;

/** Strips `// @label` markers from a C++ snippet and returns label -> 1-based line. */
export function parseCpp(raw: string): { code: string[]; labels: Record<string, number> } {
  const labels: Record<string, number> = {};
  const code = raw
    .replace(/\r/g, '')
    .trimEnd()
    .split('\n')
    .map((line, i) => {
      const m = line.match(MARKER);
      if (!m) return line;
      labels[m[1]] = i + 1;
      return line.replace(MARKER, '');
    });
  return { code, labels };
}

export const MAX_FRAMES = 20000;

/** Collects animation frames; deep-copies state so later mutation can't leak back. */
export class Recorder<S> {
  frames: Frame<S>[] = [];
  truncated = false;
  private labels: Record<string, number>;
  constructor(labels: Record<string, number>) {
    this.labels = labels;
  }
  add(label: string, msg: string, state: S) {
    const line = this.labels[label];
    if (line === undefined) throw new Error(`Unknown code label @${label}`);
    if (this.frames.length >= MAX_FRAMES) {
      this.truncated = true;
      return;
    }
    this.frames.push({ line, msg, state: structuredClone(state) });
  }
}

const KEYWORDS = new Set(
  'auto bool break case char class const continue default delete do double else enum false float for if inline int long namespace new nullptr private protected public return short signed sizeof static struct switch template this true typename unsigned using void while'.split(' '),
);
const TYPES = new Set('vector string pair queue priority_queue greater size_t Node TrackedVector'.split(' '));

export type Tok = { t: 'kw' | 'ty' | 'num' | 'str' | 'com' | 'fn' | 'pl'; s: string };

/** Tiny C++ tokenizer for highlighting — good enough for the snippets we show. */
export function highlight(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /(\/\/.*$)|("(?:\.|[^"])*"|'(?:\.|[^'])*')|(\b\d+\b)|([A-Za-z_]\w*)(\s*\()?|(\s+|[^\w\s])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m[1]) out.push({ t: 'com', s: m[1] });
    else if (m[2]) out.push({ t: 'str', s: m[2] });
    else if (m[3]) out.push({ t: 'num', s: m[3] });
    else if (m[4]) {
      const w = m[4];
      const t = KEYWORDS.has(w) ? 'kw' : TYPES.has(w) ? 'ty' : m[5] ? 'fn' : 'pl';
      out.push({ t, s: w });
      if (m[5]) out.push({ t: 'pl', s: m[5] });
    } else out.push({ t: 'pl', s: m[6] });
  }
  return out;
}

/** Tracks a recursion tree while an engine runs; pass `snapshot()` into frame state. */
export class CallTracker {
  nodes: import('./types').CallNode[] = [];
  active: number | null = null;
  enter(label: string) {
    const id = this.nodes.length;
    this.nodes.push({ id, parent: this.active, label, done: false });
    this.active = id;
    return id;
  }
  exit() {
    if (this.active === null) return;
    const n = this.nodes[this.active];
    n.done = true;
    this.active = n.parent;
  }
  snapshot() {
    return { calls: this.nodes, activeCall: this.active };
  }
}
