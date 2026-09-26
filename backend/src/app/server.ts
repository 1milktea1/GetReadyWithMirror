// Laptop API for the mirror. Run from backend/: `npm run dev`
// Vite proxies `/api` to this port. Weather's standalone dev server remains available
// as `npm run dev:weather` and serves weather only.

import { createApp } from './createApp.ts';

const PORT = Number(process.env.PORT ?? 3001);

createApp().listen(PORT, () => {
  console.log(`Mirror API: http://localhost:${PORT}/api/planner`);
});
