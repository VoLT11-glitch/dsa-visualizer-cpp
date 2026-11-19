import { useEffect, useState } from 'react';
import { Visualizer } from './pages/Visualizer';
import { ComplexityLab } from './pages/ComplexityLab';
import { TraceReplay } from './pages/TraceReplay';
import { Race } from './pages/Race';
import { Analyze } from './pages/Analyze';
import { Intro } from './components/Intro';

type Page = 'viz' | 'race' | 'lab' | 'analyze' | 'replay';
type Route = { page: Page; algo: string; params: URLSearchParams };

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const m = path.match(/^viz\/([\w-]+)/);
  if (m) return { page: 'viz', algo: m[1], params };
  const page = (['race', 'lab', 'analyze', 'replay'] as const).find((p) => p === path);
  return { page: page ?? 'viz', algo: 'bubble', params };
}

type Theme = 'system' | 'light' | 'dark';
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const TABS: [Page, string, string][] = [
  ['viz', 'Visualize', '#/viz/bubble'],
  ['race', 'Race', '#/race'],
  ['lab', 'Complexity lab', '#/lab'],
  ['analyze', 'Analyze my C++', '#/analyze'],
  ['replay', 'Trace replay', '#/replay'],
];

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash);
  const [theme, setTheme] = useState<Theme>(() => (store.get('theme') as Theme) || 'system');
  const [intro, setIntro] = useState(() => !store.get('introSeen'));

  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    store.set('theme', theme);
  }, [theme]);

  const nextTheme: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
  const themeIcon = { system: '◐', light: '☀', dark: '☾' }[theme];
  const closeIntro = () => { setIntro(false); store.set('introSeen', '1'); };

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/viz/bubble">
          <span className="logo">{'{ }'}</span> DSA Visualizer <span className="muted">C++</span>
        </a>
        <nav className="tabs">
          {TABS.map(([page, label, href]) => (
            <a key={page} className={route.page === page ? 'on' : ''} href={href}
              onClick={(e) => { if (page === 'viz' && route.page === 'viz') e.preventDefault(); }}>{label}</a>
          ))}
        </nav>
        <div className="top-actions">
          <button className="icon ghost" title="Help" aria-label="Show intro" onClick={() => setIntro(true)}>?</button>
          <button className="icon ghost" title={`Theme: ${theme} (click to change)`} aria-label={`Theme: ${theme}`} onClick={() => setTheme(nextTheme[theme])}>{themeIcon}</button>
          <a className="gh muted" href="https://github.com/VoLT11-glitch/dsa-visualizer-cpp" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </header>
      <main>
        {route.page === 'viz' && <Visualizer algoId={route.algo} params={route.params} onPick={(id) => { window.location.hash = `/viz/${id}`; }} />}
        {route.page === 'race' && <Race />}
        {route.page === 'lab' && <ComplexityLab />}
        {route.page === 'analyze' && <Analyze />}
        {route.page === 'replay' && <TraceReplay />}
      </main>
      {intro && <Intro onClose={closeIntro} />}
    </div>
  );
}
