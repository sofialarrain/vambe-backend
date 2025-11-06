# Integración con Claude AI (Anthropic)

## Visión General

Este documento describe cómo se integra Claude AI en la aplicación para realizar categorización automática de transcripciones de reuniones de ventas.

## ¿Por qué Claude AI?

### Ventajas Clave

1. **Comprensión de Contexto Superior**
   - Excelente para analizar conversaciones largas
   - Entiende matices y contexto empresarial

2. **Respuestas Estructuradas**
   - Capaz de responder en formato JSON consistente
   - Bajo rate de errores de formato

3. **Free Tier Generoso**
   - Créditos gratuitos para comenzar
   - Suficiente para desarrollo y pruebas

4. **Baja Tasa de Alucinaciones**
   - Más confiable que otros modelos
   - Responde "no sé" cuando no está seguro

## Arquitectura de Integración

```
┌─────────────────────────────────────────┐
│      Backend (NestJS)                   │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  CategorizationService         │    │
│  │  - processAllUnprocessedClients│    │
│  │  - processSingleClient         │    │
│  └────────────┬───────────────────┘    │
│               │                         │
│  ┌────────────▼───────────────────┐    │
│  │  LlmService                    │    │
│  │  - categorizeTranscription     │    │
│  │  - buildPrompt                 │    │
│  │  - parseResponse               │    │
│  └────────────┬───────────────────┘    │
│               │                         │
└───────────────┼─────────────────────────┘
                │
                │ HTTP Request
                ▼
    ┌─────────────────────────┐
    │   Anthropic API         │
    │   (Claude 3.5 Sonnet)   │
    └─────────────────────────┘
```

## Implementación

### 1. Configuración del Cliente

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class LlmService {
  private anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.anthropic = new Anthropic({ apiKey });
  }
}
```

### 2. Modelo Utilizado

**Modelo:** `claude-3-5-sonnet-20241022`

**Características:**
- 200K tokens de contexto
- Excelente para análisis de texto
- Balance entre velocidad y calidad
- Pricing competitivo

### 3. Prompt Engineering

El prompt está cuidadosamente diseñado para obtener resultados estructurados:

```typescript
private buildCategorizationPrompt(
  transcription: string,
  clientName: string,
  closed: boolean
): string {
  return `You are an expert sales analyst. Analyze the following sales meeting transcription and extract key dimensions in JSON format.

Client Name: ${clientName}
Deal Status: ${closed ? 'CLOSED (Won)' : 'NOT CLOSED (Lost/Ongoing)'}

Transcription:
"""
${transcription}
"""

Extract and return ONLY a valid JSON object with the following fields (no additional text or explanation):

{
  "industry": "The business sector/industry",
  "operationSize": "small | medium | large",
  "interactionVolume": number,
  "discoverySource": "How they discovered Vambe",
  "mainMotivation": "Primary motivation",
  "urgencyLevel": "immediate | planned | exploratory",
  "painPoints": ["Array of specific problems"],
  "technicalRequirements": ["Array of technical needs"],
  "sentiment": "positive | neutral | skeptical"
}

IMPORTANT: Return ONLY the JSON object, nothing else.`;
}
```

### 4. Estrategia de Parsing

El servicio incluye parsing robusto con validación:

```typescript
private parseCategorizationResponse(response: string): CategorizationResult {
  try {
    // Extraer JSON del response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalizar y validar
    return {
      industry: parsed.industry || 'Unknown',
      operationSize: this.normalizeOperationSize(parsed.operationSize),
      interactionVolume: parseInt(parsed.interactionVolume) || 0,
      // ... más campos con normalización
    };
  } catch (error) {
    this.logger.error('Error parsing response:', error);
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}
```

## Dimensiones Extraídas

### 1. Industry (Industria)

**Tipo:** String  
**Ejemplos:**
- financial services
- e-commerce
- healthcare
- education
- logistics
- consulting
- technology

**Cómo se extrae:**
- Análisis de palabras clave en la transcripción
- Contexto del negocio mencionado
- Tipo de problemas descritos

### 2. Operation Size (Tamaño de Operación)

**Tipo:** Enum (`small` | `medium` | `large`)  
**Criterios:**
- `small`: < 100 interacciones semanales
- `medium`: 100-250 interacciones semanales
- `large`: > 250 interacciones semanales

### 3. Interaction Volume (Volumen de Interacciones)

**Tipo:** Number  
**Descripción:** Número aproximado de interacciones semanales mencionadas

### 4. Discovery Source (Fuente de Descubrimiento)

**Tipo:** String  
**Ejemplos:**
- conference
- recommendation
- Google search
- LinkedIn
- article
- event
- webinar

### 5. Main Motivation (Motivación Principal)

**Tipo:** String  
**Ejemplos:**
- efficiency
- scalability
- personalization
- integration
- automation
- cost reduction

### 6. Urgency Level (Nivel de Urgencia)

**Tipo:** Enum (`immediate` | `planned` | `exploratory`)  
**Descripción:**
- `immediate`: Necesidad urgente, buscan implementar pronto
- `planned`: Tienen timeline definido, evaluando opciones
- `exploratory`: Investigando, sin urgencia clara

### 7. Pain Points (Puntos de Dolor)

**Tipo:** Array<String>  
**Ejemplos:**
- "high workload on support team"
- "slow response times"
- "repetitive queries"
- "scaling issues"

### 8. Technical Requirements (Requerimientos Técnicos)

**Tipo:** Array<String>  
**Ejemplos:**
- "multi-language support"
- "CRM integration"
- "data confidentiality"
- "real-time updates"
- "API access"

### 9. Sentiment (Sentimiento)

**Tipo:** Enum (`positive` | `neutral` | `skeptical`)  
**Descripción:**
- `positive`: Entusiasmado, listo para comprar
- `neutral`: Interesado pero cauteloso
- `skeptical`: Dudas o preocupaciones

## Rate Limiting y Optimización

### 1. Batch Processing con Delay

```typescript
for (const client of clients) {
  await this.processClient(client);
  await this.sleep(1000); // 1 segundo entre requests
}
```

**Razones:**
- Respetar límites de API
- Evitar throttling
- Dar tiempo al modelo para responder

### 2. Manejo de Errores

```typescript
try {
  const result = await this.llmService.categorize(client);
  await this.clientsService.markAsProcessed(client.id, result);
  processed++;
} catch (error) {
  this.logger.error(`Failed to process ${client.name}:`, error.message);
  failed++;
  // Continuar con el siguiente
}
```

### 3. Tracking de Procesamiento

```typescript
// Campo en DB
processed: Boolean
processedAt: DateTime

// Permite:
// - Ver qué clientes faltan procesar
// - Reprocesar si es necesario
// - Auditoría de cuándo se procesó
```

## Costos y Consideraciones

### Pricing (aproximado)

**Claude 3.5 Sonnet:**
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens

**Para este proyecto (61 clientes):**
- Promedio ~500 tokens input por transcripción
- Promedio ~200 tokens output por respuesta
- Total: ~30,500 input + ~12,200 output tokens
- **Costo estimado: ~$0.27 USD** (muy bajo)

### Free Tier

Anthropic ofrece **$5 USD en créditos gratuitos**, suficiente para:
- ~18,000 procesamiento de clientes de este tipo
- Desarrollo y pruebas extensivas

## Mejores Prácticas

### 1. Prompt Engineering

✅ **Hacer:**
- Ser específico en las instrucciones
- Pedir formato JSON explícitamente
- Incluir ejemplos cuando sea necesario
- Usar "IMPORTANT" para instrucciones críticas

❌ **Evitar:**
- Prompts ambiguos
- Demasiadas instrucciones a la vez
- Esperar perfección sin ejemplos

### 2. Validación de Respuestas

✅ **Hacer:**
- Siempre validar el JSON parseado
- Tener valores por defecto
- Normalizar respuestas (lowercase, trim)
- Loguear errores para debugging

❌ **Evitar:**
- Confiar ciegamente en el output
- No manejar casos edge
- Fallar silenciosamente

### 3. Error Handling

✅ **Hacer:**
- Try-catch en todas las llamadas a API
- Reintentos con backoff exponencial
- Logging detallado
- Notificar al usuario de errores

❌ **Evitar:**
- Dejar que errores propaguen sin control
- No loguear contexto del error
- Bloquear la aplicación por un error

## Alternativas Consideradas

### GPT-4 (OpenAI)

**Pros:**
- Muy popular y documentado
- Excelente calidad de respuestas

**Contras:**
- Free tier más limitado
- Más caro en producción
- Mayor latencia

### Gemini (Google)

**Pros:**
- Free tier generoso
- Buena integración con Google Cloud

**Contras:**
- Menos consistente con JSON
- Menos madurez del SDK

### LLaMA (Open Source)

**Pros:**
- Gratis para usar
- Control total

**Contras:**
- Requiere infraestructura propia
- Menor calidad que modelos comerciales
- Más complejo de mantener

## Futuras Mejoras

### 1. Caching de Resultados

```typescript
// Cachear resultados para transcripciones idénticas
const cacheKey = hash(transcription);
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 2. Fine-tuning

- Entrenar un modelo específico para Vambe
- Mejorar precisión en categorías específicas
- Reducir costos a largo plazo

### 3. Streaming de Respuestas

```typescript
// Para UX en tiempo real
const stream = await this.anthropic.messages.stream({...});
for await (const chunk of stream) {
  // Actualizar UI progresivamente
}
```

### 4. Análisis Multi-paso

```typescript
// Paso 1: Extraer categorías básicas
// Paso 2: Análisis profundo de sentimiento
// Paso 3: Recomendaciones personalizadas
```

---

Esta integración demuestra uso profesional de IA en producción, balanceando **calidad**, **costo** y **confiabilidad**.

