# Database Schema - Vambe Analytics

## Overview

The application uses PostgreSQL as the primary database, with Prisma providing type safety and automated migrations.

## Schema Diagram

```
┌─────────────────────────────────────────┐
│               clients                   │
├─────────────────────────────────────────┤
│ id                    UUID (PK)         │
│ name                  String            │
│ email                 String (Unique)   │
│ phone                 String            │
│ assignedSeller        String            │
│ meetingDate           DateTime          │
│ closed                Boolean           │
│ transcription         Text              │
│                                         │
│ // Fields enriched by the LLM           │
│ industry              String?           │
│ operationSize         String?           │
│ interactionVolume     Int?              │
│ discoverySource       String?           │
│ mainMotivation        String?           │
│ urgencyLevel          String?           │
│ painPoints            String[]          │
│ technicalRequirements String[]          │
│ sentiment             String?           │
│                                         │
│ // Metadata                             │
│ processed             Boolean           │
│ processedAt           DateTime?         │
│ createdAt             DateTime          │
│ updatedAt             DateTime          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           processing_batches            │
├─────────────────────────────────────────┤
│ id                    UUID (PK)         │
│ fileName              String            │
│ totalClients          Int               │
│ processedClients      Int               │
│ status                String            │
│ errorMessage          Text?             │
│ startedAt             DateTime          │
│ completedAt           DateTime?         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│             analysis_logs               │
├─────────────────────────────────────────┤
│ id                    UUID (PK)         │
│ clientId              String            │
│ action                String            │
│ result                JSON              │
│ executedAt            DateTime          │
└─────────────────────────────────────────┘
```

## Models

### Client

**Purpose:** Stores customer data and the categories extracted by the AI enrichment pipeline.

**Fields:**

| Field                 | Type      | Description                                   |
|-----------------------|-----------|-----------------------------------------------|
| id                    | UUID      | Primary key                                   |
| name                  | String    | Client name                                   |
| email                 | String    | Email (unique)                                |
| phone                 | String    | Phone number                                  |
| assignedSeller        | String    | Seller assigned to the account                |
| meetingDate           | DateTime  | Date of the sales meeting                     |
| closed                | Boolean   | Whether the deal was closed                   |
| transcription         | Text      | Full meeting transcription                    |
| industry              | String?   | Industry inferred by the LLM                  |
| operationSize         | String?   | Size: small / medium / large                  |
| interactionVolume     | Int?      | Weekly interaction volume                     |
| discoverySource       | String?   | How the client discovered Vambe               |
| mainMotivation        | String?   | Main motivation for exploring Vambe           |
| urgencyLevel          | String?   | Urgency: immediate / planned / exploratory    |
| painPoints            | String[]  | List of stated pain points                    |
| technicalRequirements | String[]  | List of stated technical requirements         |
| sentiment             | String?   | Sentiment: positive / neutral / skeptical     |
| processed             | Boolean   | Indicates whether the record was enriched     |
| processedAt           | DateTime? | Timestamp of the last enrichment              |
| createdAt             | DateTime  | Creation timestamp                            |
| updatedAt             | DateTime  | Last update timestamp                         |

**Indexes:**

```prisma
@@index([assignedSeller])
@@index([industry])
@@index([closed])
@@index([meetingDate])
```

### ProcessingBatch

**Purpose:** Tracks CSV batch processing jobs and their outcomes.

**Fields:**

| Field            | Type      | Description                              |
|------------------|-----------|------------------------------------------|
| id               | UUID      | Primary key                              |
| fileName         | String    | Uploaded CSV file name                   |
| totalClients     | Int       | Number of records in the batch           |
| processedClients | Int       | Number of records successfully processed |
| status           | String    | Current processing status                |
| errorMessage     | Text?     | Error message when the batch fails       |
| startedAt        | DateTime  | Processing start time                    |
| completedAt      | DateTime? | Processing completion time               |

**Status Values:**
- `pending`: Waiting to be processed
- `processing`: Currently being processed
- `completed`: Successfully completed
- `failed`: Failed during processing

### AnalysisLog

**Purpose:** Provides an audit trail of analytical and AI operations.

**Fields:**

| Field      | Type     | Description                         |
|------------|----------|-------------------------------------|
| id         | UUID     | Primary key                         |
| clientId   | String   | Related client identifier           |
| action     | String   | Type of analysis or operation       |
| result     | JSON     | Structured payload with the output  |
| executedAt | DateTime | Timestamp of the executed action    |

**Action Types:**
- `categorization`: AI-generated client categorization
- `prediction`: Conversion prediction output
- `comparison`: Comparative analytics between clients

## Common Queries

### Get All Clients with Filters

```typescript
const clients = await prisma.client.findMany({
  where: {
    processed: true,
    industry: 'technology',
    closed: true,
  },
  orderBy: {
    meetingDate: 'desc',
  },
  take: 20,
  skip: 0,
});
```

### Conversion Rate by Industry

```typescript
const clients = await prisma.client.groupBy({
  by: ['industry'],
  _count: {
    id: true,
  },
  where: {
    processed: true,
    industry: { not: null },
  },
});

// Post-process to compute closed deals per industry
for (const group of clients) {
  const closed = await prisma.client.count({
    where: {
      industry: group.industry,
      closed: true,
    },
  });

  const conversionRate = (closed / group._count.id) * 100;
}
```

### Top Pain Points

```typescript
// Fetch all processed clients that contain pain points
const clients = await prisma.client.findMany({
  where: {
    processed: true,
    painPoints: { isEmpty: false },
  },
  select: {
    painPoints: true,
    closed: true,
  },
});

// Aggregate in application code (Prisma cannot aggregate arrays natively)
const painPointMap = new Map();
for (const client of clients) {
  for (const point of client.painPoints) {
    if (!painPointMap.has(point)) {
      painPointMap.set(point, { count: 0, closed: 0 });
    }
    const entry = painPointMap.get(point);
    entry.count++;
    if (client.closed) entry.closed++;
  }
}
```

## Migrations

### Create Migration

```bash
npx prisma migrate dev --name descriptive_name
```

### Apply Migration (Production)

```bash
npx prisma migrate deploy
```

### Reset Database (Development)

```bash
npx prisma migrate reset
```

### Generate Prisma Client

```bash
npx prisma generate
```

## Prisma Studio

To visualize and edit the data locally:

```bash
npx prisma studio
```

Opens at: http://localhost:5555


