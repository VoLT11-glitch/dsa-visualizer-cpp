import type { Vars as V } from '../core/types';

export function Vars({ vars }: { vars: V }) {
  const entries = Object.entries(vars);
  if (!entries.length) return null;
  return (
    <div className="vars">
      {entries.map(([k, v]) => (
        <span key={k} className="var"><span className="vk">{k}</span> = <span className="vv">{String(v)}</span></span>
      ))}
    </div>
  );
}
