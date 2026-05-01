# Twitch Overlay Studio (Vercel + Supabase)

Overlay Twitch animé + panel de customisation, utilisable depuis **n'importe où** via URL, avec un setup qui reste généralement **gratuit**.
t
## Architecture

- Front statique: `public/overlay.html` et `public/panel.html`
- Backend serverless: `api/*` (Vercel Functions)
- Realtime + stockage: Supabase (`overlay_state`, `overlay_events`)
- Sync viewers Twitch: endpoint cron `api/twitch/sync-viewers.js`

## Features

- Overlay web animé (`/overlay`) compatible OBS Browser Source
- Panel web (`/panel`) avec customisation live (theme/layout/widgets/alertes)
- Widgets inclus:
  - compteur viewers
  - compteur followers
  - dernier follow
- Alertes follow animées
- Endpoint webhook follow: `POST /api/events/follow`
- Option de sécurité panel avec token (`PANEL_WRITE_TOKEN`)

## 1) Setup Supabase

1. Crée un projet Supabase (free tier)
2. Ouvre SQL Editor et exécute `supabase/schema.sql`
3. Récupère:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

## 2) Variables d'environnement

Copie `.env.example` vers `.env` en local, et configure les mêmes variables dans Vercel:

```bash
copy .env.example .env
```

Variables clés:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PANEL_WRITE_TOKEN` (recommandé)
- `CRON_SECRET` (recommandé)
- `ENABLE_TWITCH_POLLING=true` si tu veux le compteur viewers live
- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_BROADCASTER_LOGIN`

## 3) Dev local

```bash
npm install
npm run dev
```

Ouvre:

- `http://localhost:3000/panel`
- `http://localhost:3000/overlay`

## 4) Déploiement Vercel

1. Push le repo sur GitHub
2. Import dans Vercel
3. Ajoute les variables d'environnement du `.env`
4. Deploy

Tu obtiens des URLs publiques, ex:

- `https://ton-projet.vercel.app/panel`
- `https://ton-projet.vercel.app/overlay`

## 5) Utilisation dans OBS

1. `Sources` → `+` → `Browser`
2. URL: `https://ton-projet.vercel.app/overlay`
3. Taille: ex. `1920x1080`

## Endpoints utiles

- `GET /api/state` → état public overlay
- `POST /api/settings` → update settings (token panel si activé)
- `POST /api/events/follow` → déclenche un follow
- `POST /api/stats/reset` → reset des compteurs
- `GET /api/twitch/sync-viewers` → endpoint cron Vercel

Exemple follow (PowerShell):

```powershell
Invoke-RestMethod -Method Post -Uri https://ton-projet.vercel.app/api/events/follow -ContentType "application/json" -Headers @{"x-panel-token"="TON_TOKEN"} -Body '{"username":"NouveauFan"}'
```

## Gratuité / limites

- Vercel Free + Supabase Free suffisent pour un usage perso dans la plupart des cas.
- Les limites free-tier existent (requêtes, realtime, exécutions fonctions, bandwidth).
- Tu peux commencer à 0€, puis upgrader seulement si ton usage explose.