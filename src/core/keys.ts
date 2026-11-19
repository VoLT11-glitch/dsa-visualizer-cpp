import type { Player } from './usePlayer';

export function useKeys(p: Player) {
  return (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === ' ') { e.preventDefault(); p.toggle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); p.step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); p.step(-1); }
    else if (e.key === 'Home') p.seek(0);
    else if (e.key === 'End') p.seek(p.last);
  };
}
