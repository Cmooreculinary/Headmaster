# Headmaster Command Center

An operations-first command center for school leadership. The MVP provides a private-by-default local duty board, a non-PII incident desk, readiness checks, and a live push-to-talk staff radio powered by Socket.IO.

> **Prototype boundary:** This release has no authentication, durable shared database, or student-record controls. Do not enter student names, medical details, contact details, or other protected records. Identity, role-based access, records retention, FERPA/privacy review, and production data storage must be approved before live institutional use.

## What is included

- Operational dashboard with open-duty, urgent-duty, incident, and readiness counts
- Duty board with assignment, zone, priority, and status controls
- Incident desk that deliberately avoids student-identifying fields
- Five-channel push-to-talk voice radio with presence, connection state, and a text fallback
- Responsive Trench Design interface with keyboard-visible focus states and accessible native controls
- Local browser persistence for duty and incident data
- Hardened Node/Express/Socket.IO relay with explicit CORS origins, payload validation, rate limiting, and health checks
- Unit tests, linting, type checking, and production builds

## Local setup

Requirements: Node.js 22 or newer and npm 10 or newer.

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The radio server runs on `http://localhost:4000`.

To test the radio, open the app in two browser windows, choose the same channel, set different call signs, allow microphone access, then hold **Push to talk** in one window. The voice burst plays in the other window after release.

## Environment variables

| Variable | Used by | Required | Purpose |
| --- | --- | --- | --- |
| `PORT` | server | No | API port; defaults to `4000` |
| `ALLOWED_ORIGINS` | server | Production | Comma-separated exact frontend origins; local defaults are explicit |
| `VITE_RADIO_SERVER_URL` | client | Production | Public HTTPS URL of the radio server |

Do not put secrets in `VITE_*` variables; Vite exposes them to the browser.

## Commands

```bash
npm run dev        # client and server together
npm run build      # type-check and build the client
npm run lint       # lint client and server source
npm test           # run unit tests once
npm run check      # lint, test, and build
npm start          # start the production radio server
```

## Deployment

### Frontend — Vercel

- Root directory: repository root
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `client/dist`
- Environment: `VITE_RADIO_SERVER_URL=https://<your-render-service>`

After changing `VITE_RADIO_SERVER_URL`, redeploy Vercel **without cache**.

### Radio server — Render

The included `render.yaml` defines the service.

- Build command: `npm install`
- Start command: `npm start`
- Set `ALLOWED_ORIGINS` to the exact deployed frontend URL, with additional exact origins separated by commas.

If dependencies change, clear the Render build cache before redeploying.

## Architecture boundary

The current browser data is intentionally device-local and the radio relay is intentionally ephemeral. Production authentication, role permissions, audit logging, cross-device data sync, long-term retention, emergency-channel policy, and infrastructure ownership are architecture-level decisions and should be routed through Conrad/EXPO before implementation.
