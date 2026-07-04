# Getting GAA Coach Hub onto your phone

This turns the app into something you tap open from your home screen — full-screen,
works offline, no app store needed. Pick **Path A** (easiest, ~5 minutes, no tools) or
**Path B** (if you want to edit and rebuild the app yourself).

Your data lives **only on the phone you use it on**. There's no cloud and no sync.
Use the in-app **Settings → Back up** regularly, and the dashboard reminder will nudge you.

---

## Path A — Fastest: drag-and-drop (no software to install)

You'll use the pre-built `dist` folder that's already in this package.

1. On a computer, find the `dist` folder included here.
2. Go to **https://app.netlify.com/drop** in a browser.
3. **Drag the whole `dist` folder** onto that page.
4. After a few seconds Netlify gives you a live link like
   `https://random-name-1234.netlify.app`. That's your app, online.
   - (Optional) Create a free Netlify account to keep the link permanently and rename it.
     Without an account the link still works but may expire.
5. **Open that link on your phone** (text/email it to yourself), then add it to your home screen:
   - **iPhone (Safari):** tap the **Share** button → **Add to Home Screen** → **Add**.
   - **Android (Chrome):** tap the **⋮** menu → **Add to Home screen** / **Install app**.
6. You'll now have a **Coach Hub icon** on your phone. Open it — it runs full-screen like a normal app and works without signal.

That's it. To update the app later, rebuild the `dist` folder (Path B) and drag it onto
Netlify Drop again (or, with an account, drag onto your existing site).

> Vercel works too (**https://vercel.com**) — drag-and-drop isn't as direct as Netlify Drop,
> so for the no-tools route Netlify is the easy choice.

---

## Path B — Rebuild it yourself (needed only if you want to change the code)

This requires **Node.js** (free): install the LTS version from **https://nodejs.org**.

Then, in a terminal, inside this project folder:

```bash
npm install      # one-time: downloads the building blocks
npm run dev      # preview on your computer at the printed http://localhost address
npm run build    # produces a fresh, deployable dist/ folder
```

- `npm run dev` is great for trying changes live before you publish.
- `npm run build` regenerates `dist/` — then deploy it exactly as in Path A.

The whole app is one file: **`src/GAACoachHub.jsx`**. Everything else is plumbing
(`index.html`, `src/main.jsx`, styling config, the icons in `public/`).

---

## Connecting it for automatic updates (optional, nicer long-term)

If you put this project on **GitHub** and link the repo to **Netlify** or **Vercel**,
every time you change the code it rebuilds and updates the live link automatically —
no more manual dragging. This needs a GitHub account and a few setup clicks; ask a
tech-comfortable friend if you want this, it's a 15-minute one-off.

---

## Important notes

- **Backups:** data is on the device only. Export from **Settings → Back up** often, and
  keep the file somewhere safe (email it to yourself). Reinstalling, clearing the browser,
  or losing the phone loses the data otherwise.
- **One device:** if two people install the link, they each get their own separate data —
  it does not sync between phones. A shared, multi-user version would need a proper backend
  (a bigger, separate project).
- **First run:** test everything once — especially a full live match start-to-finish — before
  relying on it on the sideline.
- **HTTPS:** the offline/installable features only work over https. Netlify and Vercel give
  you that automatically, so there's nothing to do.
