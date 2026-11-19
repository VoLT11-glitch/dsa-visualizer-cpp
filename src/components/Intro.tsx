import { useEffect } from 'react';

export function Intro({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro" onClick={(e) => e.stopPropagation()}>
        <h2 id="intro-title"><span className="logo">{'{ }'}</span> DSA Visualizer for C++</h2>
        <p className="muted">Watch algorithms run line by line next to real C++.</p>
        <ul>
          <li><b>Visualize</b>: 22 algorithms. Press <kbd>Space</kbd> to play and <kbd>←</kbd> <kbd>→</kbd> to step. Turn on <b>Quiz mode</b> to guess the next line.</li>
          <li><b>Race</b>: two sorts on the same input, side by side.</li>
          <li><b>Complexity lab</b>: see O(n²) vs O(n log n) as real operation counts.</li>
          <li><b>Analyze my C++</b>: paste two solutions; they're compiled, timed and Big-O-fitted.</li>
          <li><b>Trace replay</b>: run your own C++ with <code>TrackedVector</code> and watch every read, write and swap.</li>
        </ul>
        <p className="muted small">Graphs are editable, and every step has a shareable link.</p>
        <button className="primary" onClick={onClose} autoFocus>Start exploring</button>
      </div>
    </div>
  );
}
