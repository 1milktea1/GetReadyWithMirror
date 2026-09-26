// Minimal app shell (integration-owned). Mirror layout: weather on the left, calendar on the
// right, and the middle left empty so the user can see their reflection.
//
// Until typed UI events exist, clicking a module toggles its expanded view and Escape
// returns to the overview. Add ?now=<ISO time> to the URL to test a demo time.

import { useEffect, useState } from 'react';
import { WeatherPanel } from '../features/weather/WeatherPanel.tsx';

type ExpandedModule = 'weather' | null;

const demoNow = new URLSearchParams(window.location.search).get('now') ?? undefined;

export function App() {
  const [expanded, setExpanded] = useState<ExpandedModule>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="mirror">
      <section className="mirror-left">
        <WeatherPanel
          expanded={expanded === 'weather'}
          onToggle={() => setExpanded(expanded === 'weather' ? null : 'weather')}
          now={demoNow}
        />
      </section>
      <section className="mirror-center" aria-hidden="true" />
      <section className="mirror-right">{/* Calendar module goes here. */}</section>
    </main>
  );
}
