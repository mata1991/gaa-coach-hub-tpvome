# Turning on cloud sync (optional)

By default PanelPro stores everything **on your phone only**. That's private and
works offline, but if you lose the phone or the browser clears its storage, the
data is gone (which is why the app nudges you to back up).

Cloud sync fixes that: your data is saved to your own private database, so it
**survives losing your phone** and **syncs across devices** (phone + iPad).
It's completely optional — until you do the steps below, nothing changes.

Everything here uses **free tiers**.

---

## What you do (about 10 minutes)

### 1. Create a Supabase project
1. Go to <https://supabase.com> and sign up (free).
2. Click **New project**. Give it a name (e.g. `panelpro`), set a database
   password (save it somewhere), pick the closest region, and create it.

### 2. Create the table
1. In the project, open **SQL Editor** (left sidebar).
2. Open `supabase/schema.sql` from this repo, copy all of it, paste it in, and
   click **Run**. You should see "Success".

### 3. Get your two keys
1. Open **Project Settings → API**.
2. Copy the **Project URL** (looks like `https://abcd1234.supabase.co`).
3. Copy the **anon public** key (a long string). This key is safe to be public —
   the table's Row-Level Security keeps every coach's data private to them.

### 4. Give the keys to the app
Add them as repository secrets so the live app can use them:

1. On GitHub, open this repo → **Settings → Secrets and variables → Actions**.
2. Add two secrets:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key

> Once the keys are in place, tell me and I'll wire the deploy to pass them
> through at build time, finish the sign-in + sync UI, and verify it end to end.

### 5. (Optional) Email sign-in settings
By default Supabase sends a magic-link email to sign in. It works out of the box
on the free tier. In **Authentication → Providers → Email** you can confirm it's
enabled. For your own club you can also add allowed email domains later.

---

## How it works once on

- You sign in with your email (magic link — no password).
- Your whole PanelPro state is saved as one private row in the database.
- On any signed-in device it pulls your latest data on open and pushes changes
  as you make them.
- The phone keeps a local copy too, so the app still works with no signal and
  syncs when it's back.

## How it stays safe

- The database uses **Row-Level Security**: the policies in `schema.sql` mean a
  signed-in user can only ever read or write **their own** row.
- The anon key in the app can't bypass those policies, which is why it's fine
  for it to ship in a public site.
