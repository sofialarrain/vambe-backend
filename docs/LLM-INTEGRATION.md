# Claude AI (Anthropic) Integration

## Overview

This document explains how Vambe’s backend integrates with Anthropic’s Claude models to enrich sales meeting transcripts, generate tailored insights, and keep analytics dashboards up to date.

## Why Claude AI?

1. **Contextual Understanding**  
   Handles long-form conversations and business nuance without losing track of stakeholders or goals.

2. **Structured Output**  
   Produces JSON-like answers with a low rate of formatting errors, which keeps downstream parsing simple.

3. **Developer-Friendly Pricing**  
   Claude Haiku’s usage-based tier is inexpensive for prototyping and scales gradually with demand.

4. **Responsible Behavior**  
   Lower hallucination rates and more frequent “I’m not sure” answers compared with other providers.

## Integration Architecture

```
┌───────────────────────────────────────────────┐
│                 NestJS Backend                │
│                                               │
│  ┌─────────────────────────────────────────┐  │
│  │ CategorizationService                   │  │
│  │  - processAllUnprocessedClients()       │  │
│  │  - processSingleClient()                │  │
│  └─────────────────────────────┬───────────┘  │
│                                │              │
│  ┌─────────────────────────────▼───────────┐  │
│  │ Insight Generators                     │  │
│  │  - Seller/Industry/Client analytics    │  │
│  │  - Timeline & predictions              │  │
│  └─────────────────────────────┬───────────┘  │
│                                │              │
│  ┌─────────────────────────────▼───────────┐  │
│  │ AnthropicClientService                  │  │
│  │  - Loads API key                        │  │
│  │  - Wraps anthropic.messages.create()    │  │
│  └─────────────────────────────┬───────────┘  │
└────────────────────────────────┼──────────────┘
                                 │ HTTPS
                                 ▼
                    ┌───────────────────────┐
                    │ Anthropic Claude API  │
                    └───────────────────────┘
```

## Implementation

### Client setup

```typescript
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicClientService {
  private anthropic: Anthropic | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey && apiKey !== 'your-api-key-here') {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not configured. LLM features will not work.');
    }
  }

  isConfigured(): boolean {
    return this.anthropic !== null;
  }

  async sendMessage(request: AnthropicMessageRequest): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic API not configured');
    }

    const response = await this.anthropic.messages.create({
      model: request.model || LLM_CONSTANTS.DEFAULT_MODEL,
      max_tokens: request.maxTokens || LLM_CONSTANTS.MAX_TOKENS.DEFAULT,
      messages: [{ role: 'user', content: request.prompt }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}
```

### Model in use

- **Default model:** `claude-3-haiku-20240307` (`LLM_CONSTANTS.DEFAULT_MODEL`)
- Overridable per-call by providing a `model` in the `sendMessage` request.
- Token budgets are capped by `LLM_CONSTANTS.MAX_TOKENS.*` to keep latency predictable.

### Prompt engineering

The categorization prompt guides Claude to emit a strict JSON object:

```typescript
const prompt = `You are an expert sales analyst. Analyze the following sales meeting transcription and extract key dimensions in JSON format.

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
```

Each insight generator has its own prompt builder to shape tone (recommendations vs. narrative summaries) and to truncate raw data using `LLM_CONSTANTS.TRANSCRIPTION_TRUNCATE`.

### Response parsing

Responses are validated through `ResponseParserService`, which extracts the JSON payload, applies defaults, and normalizes enums:

```typescript
const fallback = { industry: 'Unknown', operationSize: 'medium', ... };
const parsed = this.responseParser.parseJsonResponse<any>(responseText, fallback);

return {
  industry: parsed.industry || 'Unknown',
  operationSize: NormalizationUtil.normalizeOperationSize(parsed.operationSize),
  interactionVolume: parseInt(parsed.interactionVolume) || 0,
  // ...
};
```

When parsing fails the service logs the error and surfaces an exception so the caller can record the failure.

## Extracted dimensions

1. **Industry** (`string`) – Derived from sector keywords and business context.  
   Example values: `financial services`, `e-commerce`, `healthcare`.

2. **Operation size** (`small | medium | large`) – Heuristic mapping based on interaction volume hints shared during the call.

3. **Interaction volume** (`number`) – Approximate weekly contact volume referenced in the transcript.

4. **Discovery source** (`string`) – How the prospect heard about Vambe (e.g., `conference`, `referral`, `LinkedIn`).

5. **Main motivation** (`string`) – Primary reason the prospect is evaluating Vambe (`efficiency`, `automation`, `cost reduction`, etc.).

6. **Urgency level** (`immediate | planned | exploratory`) – Captures timeline expectations voiced during the conversation.

7. **Pain points** (`string[]`) – List of concrete problems the prospect wants to solve.

8. **Technical requirements** (`string[]`) – Integration or compliance must-haves, like `CRM integration` or `data residency`.

9. **Sentiment** (`positive | neutral | skeptical`) – Claude’s read on the buyer’s attitude toward the solution.

## Processing workflow and safeguards

- **Batch pacing:** `CategorizationService.processAllUnprocessedClients()` sleeps for 1 second between requests to respect rate limits.
- **Fallback defaults:** Normalized results always supply sensible defaults to keep database writes consistent.
- **Cache refresh:** When AI enrichment succeeds, `CacheService.clearAnalyticsCache()` invalidates Redis so dashboards pick up fresh metrics on the next request.
- **Error handling:** Failures are logged with the client name, the record stays flagged as unprocessed, and processing continues with the next client.

## Anthropic API calls in the codebase

1. **`CategorizationService.categorizeTranscription`** – Sends the full meeting transcript and retrieves structured client attributes.  
   Path: `src/llm/categorization.service.ts`

2. **`SellerInsightsGeneratorService.generateSellerFeedback`** – Asks Claude for bullet recommendations for a seller based on performance stats.  
   Path: `src/llm/generators/seller-insights-generator.service.ts`

3. **`SellerInsightsGeneratorService.generateSellerCorrelationInsight`** – Requests a short narrative explaining which segments work best for a seller.  
   Path: `src/llm/generators/seller-insights-generator.service.ts`

4. **`SellerInsightsGeneratorService.generateSellerTimelineInsight`** – Summarizes seller momentum over a selected period.  
   Path: `src/llm/generators/seller-insights-generator.service.ts`

5. **`PredictionsGeneratorService.generateWinProbability`** (called inside `generateConversionPredictions`) – Obtains a quick probability-style summary per client cohort.  
   Path: `src/llm/generators/predictions-generator.service.ts`

6. **`IndustryInsightsGeneratorService.generateDistributionInsight`** – Produces a narrative about how industries are distributed in the pipeline.  
   Path: `src/llm/generators/industry-insights-generator.service.ts`

7. **`IndustryInsightsGeneratorService.generateConversionInsight`** – Explains which industries convert best and why.  
   Path: `src/llm/generators/industry-insights-generator.service.ts`

8. **`ClientInsightsGeneratorService.generatePerceptionSummary`** – Summarizes how clients perceive Vambe post-meeting.  
   Path: `src/llm/generators/client-insights-generator.service.ts`

9. **`ClientInsightsGeneratorService.generateSolutionIdeas`** – Suggests custom follow-up ideas for a set of clients.  
   Path: `src/llm/generators/client-insights-generator.service.ts`

10. **`AnalyticsInsightsGeneratorService.generatePainPointInsight`** – Highlights dominant pain points and how they impact conversions.  
    Path: `src/llm/generators/analytics-insights-generator.service.ts`

11. **`AnalyticsInsightsGeneratorService.generateVolumeVsConversionInsight`** – Describes trends between meeting volume and closing rates.  
    Path: `src/llm/generators/analytics-insights-generator.service.ts`

12. **`AnalyticsInsightsGeneratorService.generateTimelineInsight`** – Builds a narrative timeline across time buckets for sales performance.  
    Path: `src/llm/generators/analytics-insights-generator.service.ts`

Each method delegates to `AnthropicClientService.sendMessage`, ensuring consistent configuration, logging, and error handling across all Claude interactions.

