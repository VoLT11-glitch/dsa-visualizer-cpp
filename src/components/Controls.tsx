import type { Player } from '../core/usePlayer';

export function Controls({ p, count }: { p: Player; count: number }) {
  return (
    <div className="controls">
      <div className="btns">
        <button className="icon" title="First step (Home)" onClick={() => p.seek(0)} disabled={p.idx === 0}>⏮</button>
        <button className="icon" title="Step back (←)" onClick={() => p.step(-1)} disabled={p.idx === 0}>◀</button>
        <button className="icon primary" title="Play / pause (Space)" onClick={p.toggle} disabled={count <= 1}>
          {p.playing ? '❚❚' : '▶'}
        </button>
        <button className="icon" title="Step forward (→)" onClick={() => p.step(1)} disabled={p.idx >= p.last}>▶|</button>
        <button className="icon" title="Last step (End)" onClick={() => p.seek(p.last)} disabled={p.idx >= p.last}>⏭</button>
      </div>
      <input
        className="scrub"
        type="range"
        min={0}
        max={p.last}
        value={p.idx}
        onChange={(e) => p.seek(Number(e.target.value))}
        aria-label="Scrub through steps"
      />
      <span className="counter">{count ? p.idx + 1 : 0} / {count}</span>
      <label className="speed">
        <span className="muted">speed</span>
        <input type="range" min={1} max={10} value={p.speed} onChange={(e) => p.setSpeed(Number(e.target.value))} />
      </label>
    </div>
  );
}
