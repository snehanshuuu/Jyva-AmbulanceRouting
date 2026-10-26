# 🚑 Jyva

**Clear roads. Ready hospitals. Every minute counts.**

Jyva is a two-screen web dashboard for **Automated Ambulance Traffic Routing and Early Patient Prioritization**.

- **Ambulance Screen:** fastest traffic-aware route, nearby hospitals ranked by *travel time + waiting time*, quick vitals to get a patient priority, and one-tap alert to the hospital.
- **Hospital Screen:** shows incoming ambulances with **which hospital/operator each belongs to, where the patient is coming from, priority and ETA**, and lets the hospital update its waiting time and bed availability.

> ⚠️ **Demo project.** Traffic, waiting times, beds and ambulances are simulated. Patient priority is demo decision-support only and is not medical advice.

---

## ✨ Features

- 🗺️ Route on a real-time Google Maps-style navigation map (MapLibre GL JS + OpenFreeMap) with simulated traffic segment coloring (clear / slow / heavy) and "time saved" detour badges
- 🔁 Automatic re-routing when a traffic jam appears
- 🏥 Nearby hospitals ranked by ETA + waiting time (with specialty check)
- 🩺 Light patient priority: Critical / Urgent / Stable, with reasons
- 📣 One-tap alert to the hospital, with acknowledge and ready status
- 🔐 Role-based login: ambulance crews sign in with ambulance data, hospital staff with hospital data
- 🪪 Hospital sees ambulance ID, operator, base hospital and trip origin (scene or hospital transfer)
- ⚙️ Hospital controls its own waiting time, ER/ICU beds and diverted status
- 🎬 Demo simulation with a reset button

## 🧱 Tech Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · MapLibre GL JS + OpenFreeMap (bright light vector tiles; OSM raster fallback) · OSRM routing (`steps=true`) · Zustand · Supabase Realtime (multi-device sync) · Vitest · Vercel

*Note: Basemap tiles are rendered with zero API keys via OpenFreeMap. Traffic congestion colors along route segments are simulated for demo and emergency response evaluation.*

## 📁 Docs

| File | Purpose |
|---|---|
| [`PRD.md`](./PRD.md) | What we are building and why |
| [`architecture.md`](./architecture.md) | Modules, data models, routing, ranking and sync design |

## 🚀 Getting Started

```bash
git clone <your-repo-url> jyva
cd jyva
npm install
npm run dev
# open http://localhost:3000
```

### Optional: two-device sync (Supabase)

1. Create a free Supabase project and tables `hospitals` and `trips` as described in `architecture.md` §9.
2. Add to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Without these, Jyva falls back to same-browser sync (open the two screens in two tabs).

### Demo logins (seeded, fake)

| Role | ID | Secret |
|---|---|---|
| Ambulance | `AMB-014` | PIN `1234` |
| Hospital | `HOSP-SION` | Password `demo123` |

These are demo-only accounts with no real security. Add more in `src/data/accounts.json`.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run lint` | Lint |

## 🖥️ Screens

| Route | For |
|---|---|
| `/` | Login: Ambulance Login or Hospital Login |
| `/ambulance` | Ambulance crew |
| `/hospital` | Hospital ER staff |

## 🎬 Demo Script (2–3 minutes)

1. Log in as a hospital (e.g., `HOSP-SION`) on one screen and set its waiting time.
2. Log in as an ambulance (e.g., `AMB-014`) on another screen. Show that the ambulance ID, operator and base hospital loaded automatically from the login.
3. Show the route, ETA and the nearby hospitals ranked by ETA + waiting time.
4. Change a hospital's waiting time on the hospital screen and watch the ranking change on the ambulance screen.
5. Enter vitals (e.g., HR 132, SpO₂ 88, BP 85) → priority shows **Critical** with reasons.
6. Tap **Send alert** → the incoming card appears on the hospital screen with ambulance ID, operator/base hospital, origin, priority and ETA.
7. Acknowledge and mark Ready on the hospital screen → the ambulance screen status updates.
8. Add a traffic jam on the route → the route changes and the ETA updates on both screens.

## 🤖 Building with Antigravity

Keep `README.md`, `PRD.md` and `architecture.md` in the workspace root so the agent uses them as context.

### Suggested workspace rules

```
- Follow PRD.md for requirements and architecture.md for structure and data models.
- Scope is two screens only: Ambulance Screen and Hospital Screen. Do not add a dispatcher, traffic panel or full analytics.
- The project name is "Jyva". Use "Jyva" in UI text and "jyva" in package names and slugs.
- Keep logic in /src/engine as pure functions with no React imports.
- Use Leaflet + OpenStreetMap and OSRM; never add paid APIs.
- Ambulance Screen is a landscape dashboard (PC / in-vehicle display), not a mobile app: controls on the left, navigator map on the right.
- Login is required: ambulance crews sign in with ambulance ID + crew PIN, hospital staff with hospital ID + staff password. Route guards keep each role on its own screen; no hospital selector dropdown.
- Hospital cards must show ambulance ID, operator, base hospital and trip origin.
- Every route choice, hospital rank and priority must include a readable reason.
- Show "Demo decision-support only, not medical advice" next to patient priority.
- Add Vitest tests for ranking, priority and re-route logic.
- Build one milestone at a time and summarise after each.
```

### Suggested prompts

1. *"Read README.md, PRD.md and architecture.md. Scaffold the Next.js + TypeScript + Tailwind + shadcn/ui project with the folder structure from architecture.md §4, a login page with Ambulance Login and Hospital Login, role-protected routes, and seed data for hospitals, ambulances and accounts in Mumbai."*
2. *"Add the Leaflet map with hospital and ambulance markers, and the route service using OSRM with cached fallback routes."*
3. *"Implement hospital ranking (ETA + waiting time, specialty filter, diverted excluded) with the Recommended badge and reason text."*
4. *"Add the vitals form and the priority scorer from architecture.md §8 with the disclaimer."*
5. *"Implement the sync layer (Supabase Realtime plus BroadcastChannel fallback), the Send Alert flow, and the Hospital Screen incoming cards showing ambulance ID, operator, base hospital, origin, priority and ETA."*
6. *"Add hospital status editing (waiting time, beds, diverted), acknowledge/ready actions, and diversion warnings on the ambulance screen."*
7. *"Add simulation (ambulance movement, waiting-time drift), the Add traffic jam button with re-routing, and a Reset demo button."*
8. *"Polish: landscape dashboard layouts (Ambulance Screen with controls on the left and the navigator map on the right; Hospital Screen for desktop), accessibility (color + icon + text for priority), loading and error states."*

## 🗺️ Roadmap

- [x] PRD and architecture
- [ ] MVP: two screens, routing, ranking, priority, alerts
- [ ] Live GPS feed
- [ ] Real traffic data
- [ ] Traffic-signal green corridor
- [ ] Hospital system integration

## 🤝 Team

Built by Team `<your-team-name>` — `<members>`

## 📄 License

MIT (or as required by your college/hackathon).
