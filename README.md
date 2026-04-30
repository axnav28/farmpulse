# FarmPulse

FarmPulse is an institutional crop-risk intelligence platform for Indian agriculture. The product vision is to detect crop stress early, before visible damage becomes obvious, and route those signals to the organizations that can act on them first: agriculture departments, insurers, FPOs, and field extension networks.

This repository contains the current working prototype built for the ET GenAI Hackathon 2026. The implementation is centered on district-level early warning, institutional response workflows, and an auditable backend pipeline powered by real environmental data.

## Product Context

FarmPulse is built around a simple operating assumption: many farmers should benefit from better crop intelligence without being forced to use an app, own a smartphone, or interact directly with a digital system.

Instead of building a farmer-first app workflow, the current product is designed around institutional delivery:

- monitor crop-risk signals at district level
- prioritize where intervention is needed
- generate actionable outputs for government, insurers, and FPO-style stakeholders
- keep the decision path explainable and auditable

## Problem

Indian agriculture often reacts to crop stress too late. By the time visible field damage is obvious, the best prevention window may already be narrowing. Broad advisories issued at district or state level are often not specific enough, while many technology-heavy solutions depend on farmer-side apps, devices, or workflows that do not scale cleanly across smallholder contexts.

FarmPulse is intended to shift that model from reactive response to earlier institutional action.

## What Is Actually Implemented Today

The current codebase is a working prototype for district-level crop stress monitoring and institutional decision support.

Implemented in the website today:

- pan-India district monitoring dashboard
- state and district prioritization views
- district drill-down with generated risk reports
- live agent activity stream for analysis runs
- institutional response summaries
- audit log browsing and CSV export
- advisory operations UI with mock delivery workflow

Implemented in the backend today:

- district-level risk aggregation across seeded Indian districts
- NDVI-based canopy analysis using real MODIS Terra imagery
- observed weather and climatology retrieval using NASA POWER
- 5-day forecast enrichment using Open-Meteo
- modeled soil and pest-risk context
- analysis pipeline with reasoning steps, confidence, and escalation signals
- SSE event streaming for run progress
- SQLite-backed audit logging

Not currently exposed as a real end-user website feature:

- real farmer messaging dispatch
- live mandi price workflows
- production field operations integrations
- fully wired voice/TTS experience in the frontend

The backend contains speech-related endpoints, but the current website is primarily an institutional dashboard and analysis prototype, not a complete farmer communication product.

## Real Data Sources

The current implementation uses real upstream data sources where it matters most for the crop-risk workflow:

- NASA POWER daily point data for recent weather observations and climatology comparison
- MODIS Terra NDVI 8-day imagery via NASA GIBS for vegetation and canopy stress signals
- Open-Meteo for short-range 5-day forecast support

These sources are combined with district crop context and heuristic risk logic to produce the current prototype outputs.

## Current Website Surfaces

The React frontend currently exposes five main product surfaces:

- `/institutional`: pan-India institutional dashboard with state prioritization, action queue, insurance signals, and CSV export
- `/overview`: command center for running a priority scan, watching agent status, viewing recent activity, and reviewing top-level risk metrics
- `/districts`: district explorer with search, per-district report generation, reasoning chain, confidence, escalation status, and institutional advisory output
- `/audit`: audit trail with filters and CSV export
- `/advisories`: mock advisory operations center with seeded farmer records, multilingual message previews, and simulated delivery states

One important distinction:

- `/advisories` is currently a mock operational UI backed by seeded frontend data
- the institutional, overview, district, and audit pages are connected to the backend APIs

## How The Current System Works

At a high level, the prototype works like this:

1. The backend evaluates monitored districts using weather, NDVI, crop, and heuristic context.
2. It computes a district risk score and maps that score to a risk category.
3. It generates supporting outputs such as root cause, recommended action, warnings, and escalation state.
4. It packages the results into institutional views for state summaries, action queues, and insurer-style signals.
5. It records the analysis steps in an audit trail and exposes progress through server-sent events.

## Architecture

```text
apps/
  api/   FastAPI backend for analysis, aggregation, SSE events, and audit storage
  web/   React + TypeScript + Vite frontend for institutional dashboards and review flows
```

### Backend responsibilities

- expose district summaries and district detail APIs
- run the analysis pipeline for a selected district and crop
- stream agent progress events during a run
- persist audit entries to SQLite
- export audit history to CSV

### Frontend responsibilities

- render institutional and operational dashboards
- trigger backend analysis runs
- display map, prioritization, and reasoning views
- present audit records and export actions
- simulate advisory review and delivery workflows

## API Surface

The current backend exposes endpoints for:

- `GET /health`
- `GET /api/districts`
- `GET /api/district/{district_id}`
- `POST /api/analyze`
- `POST /api/farmer-query`
- `POST /api/simulate-edge-case`
- `GET /api/audit-log`
- `GET /api/audit-log/export`
- `GET /api/stream/{run_id}`

There are also speech-related endpoints in the backend:

- `POST /api/transcribe-audio`
- `POST /api/synthesize-speech`

Those endpoints exist in the service layer, but they are not the core of the current website experience.

## Key Characteristics Of The Prototype

- district-first instead of farm-by-farm manual monitoring
- institutional workflow orientation instead of direct farmer self-service
- real environmental data in the risk pipeline
- explainable reasoning output rather than black-box scoring alone
- exportable auditability for review and demos
- clear separation between implemented product behavior and future delivery vision

## Local Development

### 1. Install frontend dependencies

```bash
npm install --prefix apps/web
```

### 2. Create a Python environment and install backend dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
```

### 3. Optional backend environment configuration

If you want to tune local speech-related settings for the backend service, copy the API env template:

```bash
cp apps/api/.env.example apps/api/.env
```

### 4. Start the backend

```bash
npm run dev:api
```

If watch mode is restricted in your environment, run:

```bash
.venv/bin/python -m uvicorn apps.api.main:app --port 8000
```

### 5. Start the frontend

```bash
npm run dev:web
```

Open:

- Web: `http://localhost:5173`
- API: `http://127.0.0.1:8000`
- API health: `http://127.0.0.1:8000/health`

The frontend expects the backend on `http://127.0.0.1:8000` during local development.

## Frontend Deployment

For a hosted frontend such as Vercel, the React app needs a deployed backend URL.

Set this environment variable in the frontend deployment:

```bash
VITE_API_BASE=https://your-backend.example.com
```

Without `VITE_API_BASE`, production builds fall back to same-origin `/api/*` requests, which only works if the backend is deployed behind the same domain.

## Notes

- NASA POWER is used for observational weather context, not forecast generation.
- Short-range forecast data comes from Open-Meteo.
- The advisory operations page is intentionally demo-oriented and currently uses seeded data.
- The district and institutional flows are the most representative parts of the implemented product.

## Direction

The broader FarmPulse vision still includes stronger farmer delivery channels, deeper field integrations, and larger-scale validation. This repository, however, should be understood as a focused institutional early-warning prototype with real data ingestion, explainable district analysis, and audit-ready operational outputs.
