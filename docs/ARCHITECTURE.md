# System Architecture

## Overview
Vambe Analytics is a NestJS/PostgreSQL backend focused on sales analytics. The system ingests raw client data (CSV uploads), enriches it using Anthropic Claude, and exposes aggregated analytics through a REST API. The architecture favors clear domain separation (Clients, Analytics, LLM) and pushes heavy data crunching down to PostgreSQL via Prisma.

## High-Level Architecture Diagram
```
┌───────────────────────────────┐
│           Frontend            │
│       (Web Dashboard UI)      │
└───────────────┬───────────────┘
                │ REST / HTTPS
                ▼
┌─────────────────────────────────────────────┐
│                NestJS API                   │
│  ┌───────────────────────────────────────┐  │
│  │            Clients Module             │  │
│  │  - CSV ingestion & validation         │  │
│  │  - Client metrics responses           │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │           Analytics Module            │  │
│  │  - Aggregated SQL queries             │  │
│  │  - Insights REST endpoints            │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │              LLM Module               │  │
│  │  - Prompt building & dispatch         │  │
│  │  - Enrichment persistence             │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │     Shared Infrastructure Layer       │  │
│  │  (Prisma, ConfigService, DTOs, Logger)│  │
│  └───────────────────────────────────────┘  │
└───────────────────────┬─────────────────────┘
                        │
         ┌──────────────┴───────────────┐
         │                              │
         ▼                              ▼
┌──────────────────┐        ┌──────────────────────┐
│   PostgreSQL DB   │        │  Anthropic Claude    │
│ (Clients, Logs,   │        │   Enrichment API     │
│  ProcessingBatch) │        └──────────────────────┘
└──────────────────┘

Observability: NestJS Logger + `AnalysisLog` records capture operational events.
```

## Components and Responsibilities
### Clients Module
- REST endpoints to upload CSV files, list/filter clients, fetch metadata.
- `CsvProcessorService` validates/normalizes CSV structure and maps columns to `CreateClientDto`.
- `ClientsService` handles all DB access (via Prisma). `createMany` uses `skipDuplicates: true` and an email unique constraint to avoid duplicate rows when the same CSV is uploaded twice. The `deleteAll` operation clears `clients`, `processing_batches` and `analysis_logs` in one shot and logs the counts removed.
- Returns updated overview metrics (`totalClients`, `processedClients`, `unprocessedClients`, etc.) so the frontend can refresh dashboards immediately without re-fetching.

### Analytics Module
- REST endpoints under `/api/analytics/*`: pain points, conversion timeline, sellers, insights, etc.
- Heavy use of raw SQL via `Prisma.$queryRaw`. Key queries leverage `unnest`, `CASE WHEN`, `DATE_TRUNC`, and window-like aggregations to avoid loading large datasets into Node.js.
- Each service maps raw query results to DTOs for type safety and consistent API responses.

### LLM Module
- Orchestrates all interactions with Anthropic Claude.
- `CategorizationService`
  - Fetches unprocessed clients, generates prompts, sends them to Claude, and normalizes responses (industry, operation size, pain points, sentiment...).
  - Rate-limits calls with a simple `sleep(1000)` to respect the free tier.
  - Persists enriched data via `ClientsService.markAsProcessed`.
  - Logs outcomes (processed vs failed) for traceability.
- Additional generators produce AI insights for sellers and future conversions (used by analytics endpoints).

### Shared Infrastructure
- `PrismaModule` exposes a singleton `PrismaService` used by all modules.
- DTOs with `class-validator` provide input validation and transformation.
- `main.ts` wires global config, CORS (restricted to frontend origin), validation pipe (whitelist + implicit conversion), and Swagger docs.
- Feature-specific utilities (CSV parsing, prompt builders, date helpers) live alongside the owning module to keep the dependency graph shallow.

## Data Model (Prisma)
- `Client`: core entity storing contact info, AI-derived attributes, `processed` flag, timestamps.
- `ProcessingBatch`: optional tracking for bulk imports (useful for audits/reporting).
- `AnalysisLog`: JSON payloads describing analytical/AI operations for future traceability.
Indices exist on common filters (`assignedSeller`, `industry`, `closed`, `meetingDate`). Email is unique.

## Key Architectural Decisions
1. **REST + Prisma** instead of GraphQL/TypeORM for simplicity, strong type-safety, and better developer experience (generated client, Prisma Studio).
2. **SQL-first aggregations** (raw queries) to keep runtime predictable with large datasets.
3. **Duplicate control** based on unique email; the service vetoes repeated uploads automatically.
4. **Redis cache** fronts hot analytics endpoints so dashboards load instantly; cache invalidation piggybacks on CSV uploads and LLM enrichment events.

## Data Flows
1. **CSV Upload** → `POST /api/clients/upload` → parse & insert → return updated metrics.
2. **LLM Categorization** → `POST /api/llm/process-all` → fetch unprocessed clients → prompt Claude → update `Client` records.
3. **Analytics Queries** → `/api/analytics/...` → Prisma raw SQL → aggregate JSON response.

### Sequence: CSV Upload to Insight
```
Frontend UI            NestJS API         Clients Service      Prisma DB        LLM Service        Anthropic
     |                     |                     |                  |                |                 |
1. Upload CSV  ----------> |                     |                  |                |                 |
     |                2. parse/validate --------> |                  |                |                 |
     |                     |                3. createMany --------->|                |                 |
     |                     |                4. metrics <------------|                |                 |
5. metrics <-------------- |                     |                  |                |                 |
     |                6. trigger process --------> |                  |                |                 |
     |                     |                     |             7. fetch pending <----|                 |
     |                     |                     |                  |            8. prompt ----------->|
     |                     |                     |                  |                |            9. JSON
     |                     |                     |             10. persist updates ->|                 |
     |                     |                11. report <---------|                  |                 |
12. insights refresh <-----|                     |                  |                |                 |
```

## Testing & Operations
- Unit tests across clients, analytics, LLM (Jest).
- Environment configuration via `.env`; DTO validation guards inputs.
- Logging with NestJS `Logger` for operational insights.

This architecture keeps the backend modular yet monolithic, leverages PostgreSQL for heavy lifting, and leaves room to evolve toward background queues or microservices if throughput demands it.
