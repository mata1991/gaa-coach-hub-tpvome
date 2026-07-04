# GAA Coach Hub

A phone app for managing a GAA club team: squad, availability, line-outs, live match
tracking, fixtures, training attendance and reports. Installs to your home screen, runs
full-screen, works offline, and stores everything **on your device** (no accounts, no cloud).

## 📱 Put it on your phone

**The easiest way — a live link (set up automatically):**

This repo builds and publishes itself to **GitHub Pages** on every push to the
`claude/rebuild-51ia2r` branch. Once that has run once:

1. In GitHub, go to **Settings → Pages** and make sure the source is **"GitHub Actions"**.
2. Open the **Actions** tab, wait for the *Deploy to GitHub Pages* job to finish (green tick).
3. Your live link appears at the top of that job (looks like
   `https://<your-username>.github.io/gaa-coach-hub-tpvome/`).
4. **Open that link on your phone** and add it to your home screen:
   - **iPhone (Safari):** **Share** → **Add to Home Screen** → **Add**.
   - **Android (Chrome):** **⋮** menu → **Install app** / **Add to Home screen**.

You'll get a **Coach Hub** icon. It opens full-screen and works without signal.

> Prefer no GitHub setup? See **DEPLOY-GUIDE.md** for the drag-and-drop route (Netlify Drop,
> ~5 minutes, no tools).

## Run / build locally

```bash
npm install
npm run dev      # local preview at the printed http://localhost address
npm run build    # produces a deployable dist/ folder
```

## Project layout

- `src/GAACoachHub.jsx` — the entire application (one file).
- `src/main.jsx` — mounts the app.
- `src/index.css` — Tailwind entry.
- `public/` — app icons.
- `vite.config.js` — build + PWA (offline/installable) config.
- `.github/workflows/deploy.yml` — auto-build + publish to GitHub Pages.

## Tech

React 18, Vite 5, Tailwind CSS 3, lucide-react icons, vite-plugin-pwa.

## Data & storage

Persists to the browser's `localStorage` under the key `gaa_coach_hub_v2`. No backend,
no cloud, no accounts. Data lives only on the device you use it on — back up regularly from
**Settings → Back up** inside the app.
