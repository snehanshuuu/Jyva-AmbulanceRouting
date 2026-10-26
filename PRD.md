# Jyva — Product Requirements Document (PRD)

> **Tagline:** Clear roads. Ready hospitals. Every minute counts.
> **Full title:** Automated Ambulance Traffic Routing and Early Patient Prioritization System
> **Version:** 2.0 — slim two-screen scope (Ambulance Screen + Hospital Screen)

---

## 1. Problem

In an emergency, minutes are lost in two places:

1. **On the road** – the ambulance driver picks a route by instinct and does not know where traffic is building up.
2. **At the destination** – the nearest hospital may have a long waiting time or be full, and it learns about the patient only when the ambulance arrives.

## 2. Solution

Jyva is a simple web dashboard that runs on **two screens**:

- **Ambulance Screen** – shows the fastest traffic-aware route, ranks nearby hospitals by *travel time + waiting time*, captures quick patient vitals to assign a priority, and sends an alert to the chosen hospital.
- **Hospital Screen** – shows which ambulances are coming, **which hospital/operator each one belongs to**, patient priority and ETA, and lets the hospital keep its own waiting time and bed availability up to date.

The two screens stay in sync, so the hospital's waiting time directly influences where ambulances are sent.

## 3. Goals and Non-Goals

### Goals
- Fastest route to the hospital with live ETA and automatic re-routing when traffic changes.
- Nearby hospitals ranked by **ETA + waiting time**, with specialty match.
- Early patient priority (Critical / Urgent / Stable) from a few quick vitals.
- Hospital sees full ambulance identity (**who is coming, from where, belonging to which hospital/operator**), plus priority and ETA, before arrival.
- Role-based login: ambulance crews sign in with ambulance data, hospital staff sign in with hospital data, and each sees only their own screen.
- Both screens are landscape dashboards: the Ambulance Screen runs on a PC or in-vehicle display, and the Hospital Screen on a desktop monitor.

### Non-Goals
- Real traffic-signal control, real GPS hardware, or real hospital system integration.
- Dispatcher control room, traffic-controller panel, full analytics suite.
- Real medical diagnosis. Triage is demo decision-support only.

## 4. Users

| User | Screen | Needs |
|---|---|---|
| Ambulance driver / paramedic | Ambulance Screen | Route, ETA, best hospital, quick vitals entry, send alert |
| Hospital ER staff | Hospital Screen | Know who is arriving, from where, how serious, when; update waiting time and beds |

## 5. User Stories

**Ambulance**
- I can log in with my ambulance ID and crew PIN, and my ambulance details (plate, operator, base hospital) load automatically.
- I can see my ambulance ID and base hospital/operator on screen.
- I can see the fastest route and ETA to the selected hospital, and it updates if traffic worsens.
- I can see nearby hospitals ranked by total time (travel + waiting) and see why one is recommended.
- I can enter patient vitals in under 20 seconds and get a priority level.
- I can send an alert to the chosen hospital with one tap and see when it is acknowledged.

**Hospital**
- I can log in with my hospital ID and staff password, and see only my own hospital's data.
- I can see all ambulances heading to me, sorted by priority then ETA.
- For each ambulance I can see: ambulance ID, **operator / base hospital**, **where the patient is coming from** (accident scene or transfer from another hospital), patient priority and vitals summary, live ETA, and status.
- I can update my waiting time, free ER beds, ICU beds, and mark myself "diverted / not accepting".
- I can acknowledge an incoming ambulance and mark "ready" so the crew sees it.

## 6. Functional Requirements

### FR-0 Login and Roles
- The first screen is a login with two options: **Ambulance Login** and **Hospital Login**.
- **Ambulance Login:** Ambulance ID (or plate number) + crew PIN. On success, the ambulance's data (ID, plate, call sign, operator, base hospital) is loaded from the ambulance records and shown in the Ambulance Screen header. No manual entry of identity.
- **Hospital Login:** Hospital ID + staff password. On success, the hospital's data (name, location, waiting time, beds, specialties) is loaded, and the Hospital Screen is locked to that hospital. There is no hospital selector dropdown.
- Role-based access: an ambulance session can open only `/ambulance`; a hospital session can open only `/hospital`. A hospital can edit only its own status.
- Logout button on both screens.
- Demo-grade authentication with seeded accounts. Not for real-world use.

### FR-1 Ambulance Identity and Origin
Every ambulance record has: ID/plate, call sign, **operator** (hospital-owned, government 108-type service, or private), **base hospital** (nullable for private operators), and current trip **origin**: `SCENE` (pickup location) or `HOSPITAL_TRANSFER` (from hospital X). The hospital screen displays all of these on each incoming card.

### FR-2 Route and ETA
- Compute the fastest route from the ambulance's position to the chosen hospital.
- Show the route on the map with distance, ETA and a "time saved vs. default route" figure.
- Re-evaluate routes periodically; re-route only if a better route saves a meaningful amount of time (avoid flip-flopping).
- A demo **"Add traffic jam"** button lets you drop a jam on the map to show re-routing.

### FR-3 Nearby Hospitals Ranking
- List hospitals within a radius, each with: distance, ETA, **current waiting time**, free beds, specialties.
- Rank by `ETA + waiting time` (lower is better), after filtering out diverted hospitals and hospitals without the needed specialty/beds.
- Mark the top choice as **Recommended** with a one-line reason (e.g., "6 min away, 5 min wait, cardiac unit available").
- Driver can override and choose another hospital.

### FR-4 Light Patient Prioritization
- Form fields: heart rate, SpO₂, systolic BP, consciousness (GCS or Alert/Voice/Pain/Unresponsive), and case type (cardiac, trauma, stroke, maternity, other).
- Output a priority: **Critical / Urgent / Stable**, with reasons (e.g., "SpO₂ 88%").
- Priority is attached to the alert sent to the hospital.
- Visible disclaimer: *Demo decision-support only, not medical advice.*

### FR-5 Alert and Acknowledgement
- "Send alert" pushes the ambulance card (identity, origin, priority, vitals, ETA) to the hospital screen.
- Hospital can **Acknowledge** and mark **Ready**; the ambulance screen shows this status.
- If the hospital becomes diverted or waiting time spikes, the ambulance screen warns the driver and suggests the next-best hospital.

### FR-6 Hospital Status Management
- Hospital staff can edit waiting time (minutes), free ER beds, ICU beds, and diverted toggle. Changes affect rankings on the ambulance screen immediately.

### FR-7 Demo Simulation
- Simulated ambulance movement along the route with speed control (1x–5x).
- Simulated background traffic and hospital waiting-time fluctuation.
- Reset button to restore seed data for repeated demos.

## 7. Screens

**Ambulance Screen (`/ambulance`)** — landscape dashboard for a PC or in-vehicle display, split into two columns:

*Left column (controls, about 40% width)*
1. Header: Jyva logo, ambulance ID, operator, base hospital, trip status chip.
2. Nearby hospitals list (ranked by ETA + waiting time, with a Recommended badge and reason).
3. Patient card: vitals form (HR, SpO₂, BP, consciousness), case type selector, priority badge with reasons and the demo disclaimer.
4. Primary button: **Send alert to hospital**, with a status stepper (Sent → Acknowledged → Ready → Arrived).

*Right column (Navigator, about 60% width)*
1. Large map with the route, ambulance marker, hospital pins and jam markers.
2. Next-turn banner at the top of the navigator (turn instruction and distance).
3. Route summary strip: destination, large ETA, distance, time saved vs. default route.
4. Demo controls: Add traffic jam, simulation speed, Reset.

**Hospital Screen (`/hospital`)**
1. Header: Jyva logo, logged-in hospital name and logout button.
2. Status panel: waiting time, ER beds, ICU beds, diverted toggle.
3. Incoming ambulances list (cards sorted by priority then ETA), each showing ambulance ID, operator/base hospital, origin, priority, vitals summary, ETA countdown, status, and Acknowledge / Ready buttons.
4. Small map showing incoming ambulances approaching.

**Login Screen (`/`)** – Jyva branding and tagline with two login options:
- *Ambulance Login*: Ambulance ID / plate number + crew PIN.
- *Hospital Login*: Hospital ID + staff password.
Role is chosen by tab or card; after login the user is sent to `/ambulance` or `/hospital`.

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Usability | Ambulance Screen is a landscape dashboard readable at a glance from a mounted display, with large touch-friendly controls; vitals entry ≤ 20 s |
| Performance | Hospital ranking and priority update instantly (< 300 ms) |
| Sync | Hospital sees an alert within ~2 s of it being sent |
| Accessibility | Priority shown by color + icon + text; high contrast; large tap targets |
| Cost | No paid API keys; deployable on Vercel free tier |
| Data | Synthetic data only; no real patient information |
| Security | Demo-grade login with seeded accounts; session-based route guards; a hospital can edit only its own status |

## 9. Success Metrics (demo)

| Metric | Target |
|---|---|
| Time saved vs. default route | Visible on route card in demo |
| Alert delivery to hospital | < 2 s |
| Vitals → priority | < 20 s entry, instant result |
| Re-route after jam added | < 3 s |

## 10. Assumptions and Constraints
- Map area: a Mumbai region (e.g., Chembur–Sion–Kurla corridor) with 6–10 seeded hospitals.
- Traffic and waiting times are simulated.
- Hospital names and locations may be real, but all waiting times, beds and ambulances are fake and labelled as demo data.

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Public routing API rate limits or goes down during demo | Cache routes for seeded scenarios; fall back to cached routes |
| Two devices not syncing | Sync adapter supports Supabase Realtime for multi-device and BroadcastChannel for same-browser demo |
| Medical credibility | Simple, explainable rules and a visible disclaimer |

## 12. Future Scope
Real GPS feed, real traffic data, signal pre-emption (green corridor), hospital EMR integration, voice-based vitals entry, ML-based ETA and triage.
