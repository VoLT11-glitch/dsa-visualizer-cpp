import { useEffect, useState } from 'react';
import { Visualizer } from './pages/Visualizer';
import { ComplexityLab } from './pages/ComplexityLab';
import { TraceReplay } from './pages/TraceReplay';

type Route = { page: 'viz'; algo: string } | { page: 'lab' } | { page: 'replay' };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h === 'lab') return { page: 'lab' };
  if (h === 'replay') return { page: 'replay' };
  const m = h.match(/^viz\/([\w-]+)/);
  return { page: 'viz', algo: m ? m[1] : 'bubble' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (h: string) => { window.location.hash = h; };

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/viz/bubble">
          <span className="logo">{'{ }'}</span> DSA Visualizer <span className="muted">C++</span>
        </a>
        <nav className="tabs">
          <a className={route.page === 'viz' ? 'on' : ''} href="#/viz/bubble" onClick={(e) => { if (route.page === 'viz') e.preventDefault(); }}>Visualize</a>
          <a className={route.page === 'lab' ? 'on' : ''} href="#/lab">Complexity lab</a>
          <a className={route.page === 'replay' ? 'on' : ''} href="#/replay">Trace replay</a>
        </nav>
        <a className="gh muted" href="https://github.com/VoLT11-glitch/dsa-visualizer-cpp" target="_blank" rel="noreferrer">GitHub</a>
      </header>
      <main>
        {route.page === 'viz' && <Visualizer algoId={route.algo} onPick={(id) => go(`/viz/${id}`)} />}
        {route.page === 'lab' && <ComplexityLab />}
        {route.page === 'replay' && <TraceReplay />}
      </main>
    </div>
  );
}
