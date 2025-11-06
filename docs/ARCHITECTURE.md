# Arquitectura del Sistema - Vambe Analytics

## Visión General

Vambe Analytics es una aplicación full-stack diseñada con una arquitectura moderna de tres capas que separa claramente las responsabilidades entre presentación, lógica de negocio y persistencia de datos.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  Dashboard  │  │   Clients    │  │   Analytics   │ │
│  │    Page     │  │     Page     │  │     Page      │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
│          │                │                  │          │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Components (shadcn/ui + Custom)          │ │
│  └───────────────────────────────────────────────────┘ │
│          │                                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │              API Client (Axios)                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                    HTTP REST API
                           │
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (NestJS)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Clients    │  │     LLM      │  │  Analytics   │ │
│  │   Module     │  │   Module     │  │   Module     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                  │          │
│  ┌─────────────────────────────────────────────────┐  │
│  │           Prisma ORM (Type-safe DB)             │  │
│  └─────────────────────────────────────────────────┘  │
│         │                                               │
└─────────────────────────────────────────────────────────┘
          │                          │
   PostgreSQL                 Anthropic Claude API
  (Docker Container)          (External Service)
```

## Capas de la Aplicación

### 1. Capa de Presentación (Frontend)

**Tecnologías:**
- Next.js 14 con App Router
- React 18
- TailwindCSS + shadcn/ui
- Recharts para visualizaciones
- TypeScript

**Responsabilidades:**
- Renderizado de UI
- Gestión de estado local
- Interacción con el usuario
- Visualización de datos

**Estructura:**
```
frontend/
├── app/                    # Páginas (App Router)
│   ├── page.tsx           # Dashboard principal
│   ├── clients/           # Gestión de clientes
│   ├── analytics/         # Análisis avanzado
│   └── layout.tsx         # Layout global
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes shadcn/ui
│   ├── kpi-card.tsx      # KPI Cards
│   ├── clients-table.tsx # Tabla de clientes
│   └── navigation.tsx    # Navegación
└── lib/                   # Utilidades y API client
    ├── api.ts            # Cliente HTTP
    ├── types.ts          # Definiciones de tipos
    └── utils.ts          # Funciones auxiliares
```

### 2. Capa de Aplicación (Backend)

**Tecnologías:**
- NestJS (Node.js Framework)
- TypeScript
- Prisma ORM
- class-validator para DTOs
- Anthropic SDK

**Responsabilidades:**
- Lógica de negocio
- Validación de datos
- Procesamiento con IA
- Cálculo de métricas
- API RESTful

**Estructura:**
```
backend/
├── src/
│   ├── clients/          # Módulo de clientes
│   │   ├── clients.controller.ts
│   │   ├── clients.service.ts
│   │   ├── clients.module.ts
│   │   └── csv-processor.service.ts
│   ├── llm/              # Módulo de IA
│   │   ├── llm.controller.ts
│   │   ├── llm.service.ts
│   │   ├── categorization.service.ts
│   │   └── llm.module.ts
│   ├── analytics/        # Módulo de analytics
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── analytics.module.ts
│   ├── prisma/           # Configuración Prisma
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── common/           # Código compartido
│   │   └── dto/         # Data Transfer Objects
│   ├── app.module.ts     # Módulo raíz
│   └── main.ts          # Punto de entrada
└── prisma/
    └── schema.prisma     # Schema de DB
```

### 3. Capa de Datos (Base de Datos)

**Tecnología:** PostgreSQL 16

**Modelos Principales:**

1. **Client**: Información del cliente y categorías
2. **ProcessingBatch**: Tracking de procesamiento
3. **AnalysisLog**: Logs de análisis

## Flujo de Datos

### Flujo 1: Carga de CSV

```
Usuario → Frontend → Backend API → CSV Parser
                                        ↓
                                  Prisma ORM
                                        ↓
                                  PostgreSQL
```

### Flujo 2: Procesamiento con IA

```
Backend → Get Unprocessed Clients → Prisma → PostgreSQL
   ↓
Claude AI Service
   ↓
Categorization (Industry, Sentiment, etc.)
   ↓
Update Client → Prisma → PostgreSQL
```

### Flujo 3: Visualización de Métricas

```
Frontend → API Request → Backend Analytics Service
                              ↓
                         Prisma Aggregations
                              ↓
                          PostgreSQL
                              ↓
                         JSON Response
                              ↓
                      Frontend Components
                              ↓
                      Recharts Visualizations
```

## Patrones de Diseño

### 1. Dependency Injection (NestJS)

```typescript
@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService
  ) {}
}
```

**Ventajas:**
- Testeable
- Desacoplado
- Fácil de mantener

### 2. Repository Pattern (Prisma)

```typescript
// Prisma actúa como repository
await this.prisma.client.findMany({
  where: { processed: true },
  orderBy: { meetingDate: 'desc' }
});
```

### 3. DTO Pattern (Validación)

```typescript
export class CreateClientDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;
  
  // ... más campos
}
```

### 4. Service Layer Pattern

Separación entre Controllers (HTTP) y Services (lógica):

```typescript
// Controller: Maneja HTTP
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}
}

// Service: Lógica de negocio
@Injectable()
export class ClientsService {
  async findAll(filters) { /* ... */ }
}
```

## Decisiones Arquitectónicas

### 1. Monorepo vs Multirepo

**Decisión:** Monorepo (backend + frontend en un repositorio)

**Razones:**
- Desarrollo más rápido
- Tipos compartidos entre frontend y backend
- Despliegue sincronizado
- Menor overhead de gestión

### 2. REST vs GraphQL

**Decisión:** REST API

**Razones:**
- Simplicidad para el scope del proyecto
- Cacheo más directo
- Endpoints claros y específicos
- Menor curva de aprendizaje

### 3. ORM: Prisma vs TypeORM

**Decisión:** Prisma

**Razones:**
- Type-safety superior
- Mejor DX (Developer Experience)
- Migraciones automáticas
- Cliente generado optimizado
- Prisma Studio para debugging

### 4. UI Library: shadcn/ui

**Decisión:** shadcn/ui sobre Material-UI o Ant Design

**Razones:**
- No es una librería, es código que posees
- Totalmente customizable
- Basado en Radix UI (accesibilidad)
- Integración perfecta con TailwindCSS
- Modern aesthetics

### 5. LLM: Claude vs GPT

**Decisión:** Anthropic Claude

**Razones:**
- Free tier generoso
- Excelente comprensión de contexto
- Respuestas estructuradas (JSON)
- Bajo rate de alucinaciones
- API simple y bien documentada

## Escalabilidad

### Estrategias Implementadas

1. **Paginación**: Todas las listas tienen paginación
2. **Índices de DB**: Campos frecuentemente consultados indexados
3. **Rate Limiting**: Delay entre llamadas a Claude AI
4. **Batch Processing**: Procesamiento en lotes de clientes

### Mejoras Futuras

1. **Caching**: Redis para cachear resultados de analytics
2. **Queue System**: BullMQ para procesamiento asíncrono
3. **CDN**: Para assets estáticos del frontend
4. **Load Balancer**: Para múltiples instancias del backend
5. **Microservicios**: Separar LLM processing en servicio independiente

## Seguridad

### Implementado

1. **Environment Variables**: Secrets en .env
2. **CORS**: Configurado para frontend específico
3. **Validation**: DTOs con class-validator
4. **Type Safety**: TypeScript en todo el stack

### Recomendaciones para Producción

1. **Authentication**: JWT o OAuth2
2. **Authorization**: Roles y permisos
3. **Rate Limiting**: Throttling de requests
4. **Encryption**: HTTPS obligatorio
5. **Secrets Management**: AWS Secrets Manager o Vault
6. **SQL Injection Protection**: Prisma lo previene automáticamente

## Testing Strategy

### Niveles de Testing

1. **Unit Tests**: Servicios individuales
2. **Integration Tests**: Endpoints de API
3. **E2E Tests**: Flujos completos de usuario

### Herramientas Recomendadas

- **Backend**: Jest (incluido en NestJS)
- **Frontend**: Jest + React Testing Library
- **E2E**: Playwright o Cypress

## Monitoreo y Observabilidad

### Recomendaciones

1. **Logging**: Winston o Pino
2. **APM**: New Relic o DataDog
3. **Error Tracking**: Sentry
4. **Metrics**: Prometheus + Grafana
5. **Tracing**: OpenTelemetry

## Deployment

### Opciones Recomendadas

**Frontend:**
- Vercel (recomendado para Next.js)
- Netlify
- AWS Amplify

**Backend:**
- Railway (simple y rápido)
- Render
- AWS ECS/EKS
- DigitalOcean App Platform

**Base de Datos:**
- Railway PostgreSQL
- Supabase
- AWS RDS
- DigitalOcean Managed DB

---

Esta arquitectura balancea **simplicidad**, **escalabilidad** y **mantenibilidad**, permitiendo iteraciones rápidas mientras mantiene la calidad del código.

