export class CategorizationPromptBuilder {
  static build(transcription: string, clientName: string, closed: boolean): string {
    return `You are an expert sales analyst. Analyze the following sales meeting transcription and extract key dimensions in JSON format.

Client Name: ${clientName}
Deal Status: ${closed ? 'CLOSED (Won)' : 'NOT CLOSED (Lost/Ongoing)'}

Transcription:
"""
${transcription}
"""

Extract and return ONLY a valid JSON object with the following fields (no additional text or explanation):

{
  "industry": "The business sector/industry (e.g., financial services, e-commerce, healthcare, education, logistics, consulting, technology, etc.)",
  "operationSize": "small | medium | large (based on interaction volume: <100=small, 100-250=medium, >250=large)",
  "interactionVolume": number (approximate weekly interactions mentioned in transcription),
  "discoverySource": "How they discovered Vambe (e.g., conference, recommendation, Google search, LinkedIn, event, article, etc.)",
  "mainMotivation": "Primary motivation for seeking Vambe (e.g., efficiency, scalability, personalization, integration, automation, cost reduction)",
  "urgencyLevel": "immediate | planned | exploratory (based on tone and context)",
  "painPoints": ["List of specific problems mentioned", "e.g., high workload, slow response times, repetitive queries"],
  "technicalRequirements": ["Technical needs mentioned", "e.g., multi-language support, integration with CRM, data confidentiality, real-time updates"],
  "sentiment": "positive | neutral | skeptical (overall tone of the prospect)"
}

IMPORTANT: Return ONLY the JSON object, nothing else.`;
  }
}

