/** Minimal client for Judge0 CE (public, no key). Override with VITE_JUDGE0_URL for a self-hosted/RapidAPI instance. */
const BASE: string = import.meta.env.VITE_JUDGE0_URL ?? 'https://ce.judge0.com';
const CPP20_GCC = 105; // C++ (GCC 14.1.0)

export interface RunResult {
  ok: boolean;
  /** True only for Judge0's "Compilation Error" status; warnings alone don't count. */
  compileError: boolean;
  status: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  time: number | null;
}

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
const unb64 = (s: string | null) => (s ? new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0))) : '');

interface Raw {
  token?: string;
  status?: { id: number; description: string };
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  message: string | null;
  time: string | null;
}

export async function runCpp(source: string, opts: { flags?: string; cpuLimit?: number; signal?: AbortSignal } = {}): Promise<RunResult> {
  const body = JSON.stringify({
    source_code: b64(source),
    language_id: CPP20_GCC,
    compiler_options: opts.flags ?? '-O2 -std=c++20',
    cpu_time_limit: opts.cpuLimit ?? 8,
    wall_time_limit: Math.min(30, (opts.cpuLimit ?? 8) * 2 + 2),
  });
  const res = await fetch(`${BASE}/submissions?base64_encoded=true&wait=true`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: opts.signal,
  });
  if (res.status === 429) throw new Error('Judge0 rate limit hit — wait a minute and try again.');
  if (!res.ok) throw new Error(`Judge0 returned HTTP ${res.status}`);
  let raw = (await res.json()) as Raw;
  // Some instances ignore wait=true and only hand back a token: poll it.
  for (let tries = 0; raw.token && (!raw.status || raw.status.id <= 2) && tries < 40; tries++) {
    await new Promise((r) => setTimeout(r, 1000));
    const poll = await fetch(`${BASE}/submissions/${raw.token}?base64_encoded=true`, { signal: opts.signal });
    raw = { ...(await poll.json()), token: raw.token } as Raw;
  }
  const id = raw.status?.id ?? 0;
  return {
    ok: id === 3,
    compileError: id === 6,
    status: raw.status?.description ?? 'Unknown',
    stdout: unb64(raw.stdout),
    stderr: unb64(raw.stderr),
    compileOutput: unb64(raw.compile_output) || unb64(raw.message),
    time: raw.time ? Number(raw.time) : null,
  };
}
