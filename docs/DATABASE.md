# Database Schema - Vambe Analytics

## Overview

La aplicación utiliza PostgreSQL como base de datos principal con Prisma como ORM para type-safety y migraciones automáticas.

## Schema Diagram

```
┌─────────────────────────────────────────┐
│              clients                    │
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
│ // LLM-extracted fields                │
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
│       processing_batches                │
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
│         analysis_logs                   │
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

**Purpose:** Almacena información de clientes y sus categorías extraídas por IA.

**Fields:**

| Field                 | Type      | Description                              |
|-----------------------|-----------|------------------------------------------|
| id                    | UUID      | Primary key                              |
| name                  | String    | Nombre del cliente                       |
| email                 | String    | Email (único)                            |
| phone                 | String    | Número de teléfono                       |
| assignedSeller        | String    | Vendedor asignado                        |
| meetingDate           | DateTime  | Fecha de la reunión                      |
| closed                | Boolean   | Si se cerró la venta                     |
| transcription         | Text      | Transcripción completa                   |
| industry              | String?   | Industria (extraído por IA)              |
| operationSize         | String?   | Tamaño: small/medium/large               |
| interactionVolume     | Int?      | Volumen de interacciones semanales       |
| discoverySource       | String?   | Cómo descubrieron Vambe                  |
| mainMotivation        | String?   | Motivación principal                     |
| urgencyLevel          | String?   | Urgencia: immediate/planned/exploratory  |
| painPoints            | String[]  | Array de pain points                     |
| technicalRequirements | String[]  | Array de requerimientos técnicos         |
| sentiment             | String?   | Sentimiento: positive/neutral/skeptical  |
| processed             | Boolean   | Si fue procesado por IA                  |
| processedAt           | DateTime? | Cuándo se procesó                        |
| createdAt             | DateTime  | Fecha de creación                        |
| updatedAt             | DateTime  | Última actualización                     |

**Indexes:**

```prisma
@@index([assignedSeller])
@@index([industry])
@@index([closed])
@@index([meetingDate])
```

### ProcessingBatch

**Purpose:** Tracking de procesamiento por lotes de CSV.

**Fields:**

| Field            | Type      | Description                    |
|------------------|-----------|--------------------------------|
| id               | UUID      | Primary key                    |
| fileName         | String    | Nombre del archivo CSV         |
| totalClients     | Int       | Total de clientes en el lote   |
| processedClients | Int       | Clientes procesados            |
| status           | String    | Estado del procesamiento       |
| errorMessage     | Text?     | Mensaje de error si falló      |
| startedAt        | DateTime  | Inicio del procesamiento       |
| completedAt      | DateTime? | Fin del procesamiento          |

**Status Values:**
- `pending`: Esperando procesamiento
- `processing`: En proceso
- `completed`: Completado exitosamente
- `failed`: Falló

### AnalysisLog

**Purpose:** Auditoría de análisis y operaciones.

**Fields:**

| Field      | Type     | Description                    |
|------------|----------|--------------------------------|
| id         | UUID     | Primary key                    |
| clientId   | String   | ID del cliente relacionado     |
| action     | String   | Tipo de acción                 |
| result     | JSON     | Resultado del análisis         |
| executedAt | DateTime | Cuándo se ejecutó              |

**Action Types:**
- `categorization`: Categorización por IA
- `prediction`: Predicción de conversión
- `comparison`: Comparación de clientes

## Queries Comunes

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

// Luego calcular closed por industria
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
// Obtener todos los clientes procesados
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

// Agregar en aplicación (Prisma no soporta array aggregation directamente)
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

Para visualizar y editar datos:

```bash
npx prisma studio
```

Abre en: http://localhost:5555

## Performance Considerations

### Indexes

Campos indexados para queries rápidas:
- `assignedSeller` - Filtrado por vendedor
- `industry` - Filtrado por industria
- `closed` - Filtrado por estado
- `meetingDate` - Ordenamiento temporal

### Array Fields

`painPoints` y `technicalRequirements` son arrays PostgreSQL:
- Uso de `@default([])` para evitar nulls
- Queries con `isEmpty`, `has`, etc.

### Text vs String

`transcription` usa `@db.Text` para soportar textos largos sin límite de caracteres.

## Backup and Restore

### Backup

```bash
docker exec vambe-postgres pg_dump -U vambe vambe_db > backup.sql
```

### Restore

```bash
docker exec -i vambe-postgres psql -U vambe vambe_db < backup.sql
```

## Connection Pooling

Para producción, usar connection pooling:

```typescript
// En Prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Para producción con pooling
  // relationMode = "prisma"
}
```

## Security

### Connection String

```env
# Nunca commitear al repo
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

### Best Practices

1. **Never log sensitive data**
2. **Use environment variables**
3. **SSL in production**: `?sslmode=require`
4. **Least privilege**: DB user con permisos mínimos necesarios

---

Este schema está diseñado para **escalabilidad** y **performance**, con todas las herramientas necesarias para analytics avanzado.

