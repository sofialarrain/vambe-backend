import { LLM_CONSTANTS, API_CONSTANTS } from '../../common/constants';

export class ClientPromptBuilder {
  static buildPerceptionInsight(transcriptions: Array<{
    transcription: string;
    closed: boolean;
    sentiment: string | null;
  }>): string {
    const sampleSize = Math.min(API_CONSTANTS.LIMITS.TRANSCRIPT_SAMPLE_SMALL, transcriptions.length);
    const sampledTranscriptions = transcriptions.slice(0, sampleSize);
    
    const totalClients = transcriptions.length;
    const closedCount = transcriptions.filter(t => t.closed).length;
    const positiveSentiment = transcriptions.filter(t => t.sentiment === 'positive').length;
    const neutralSentiment = transcriptions.filter(t => t.sentiment === 'neutral').length;
    const negativeSentiment = transcriptions.filter(t => t.sentiment === 'negative').length;

    return `You are a business analyst for Vambe, a sales analytics platform. Analyze these client meeting transcripts to understand how clients perceive Vambe.

Client Statistics:
- Total clients analyzed: ${totalClients}
- Closed deals: ${closedCount} (${((closedCount / totalClients) * 100).toFixed(1)}%)
- Sentiment distribution: ${positiveSentiment} positive, ${neutralSentiment} neutral, ${negativeSentiment} negative

Sample Transcripts (${sampledTranscriptions.length} of ${totalClients}):
${sampledTranscriptions.map((t, idx) => `
Transcript ${idx + 1} (${t.closed ? 'CLOSED' : 'NOT CLOSED'}, Sentiment: ${t.sentiment || 'unknown'}):
${t.transcription.substring(0, LLM_CONSTANTS.TRANSCRIPTION_TRUNCATE.MEDIUM)}${t.transcription.length > LLM_CONSTANTS.TRANSCRIPTION_TRUNCATE.MEDIUM ? '...' : ''}
`).join('\n---\n')}

Analyze these transcripts and provide insights for each of the following aspects. Be SPECIFIC and mention actual themes, patterns, or feedback from the transcripts. Use concrete examples when possible. Each insight should be 2-3 sentences.

Return your response as a JSON object with exactly these keys:
- "positiveAspects": What do clients appreciate or value about Vambe? What strengths are mentioned?
- "concerns": What concerns, doubts, or objections do clients express? (If none, say "No significant concerns or objections were identified.")
- "successFactors": What patterns do you notice in transcripts from clients who closed deals vs those who didn't?
- "recommendations": What should the sales team focus on or improve based on client feedback?

Return ONLY valid JSON, no additional text, no markdown formatting. Example format:
{
  "positiveAspects": "Clients appreciate...",
  "concerns": "Some clients express concerns about...",
  "successFactors": "Closed deals are associated with...",
  "recommendations": "The sales team should focus on..."
}`;
  }

  static buildSolutionsInsight(transcriptions: Array<{
    transcription: string;
    closed: boolean;
    mainMotivation?: string | null;
    technicalRequirements?: string[] | null;
  }>): string {
    const sampleSize = Math.min(API_CONSTANTS.LIMITS.TRANSCRIPT_SAMPLE_MEDIUM, transcriptions.length);
    const sampledTranscriptions = transcriptions.slice(0, sampleSize);
    
    const totalClients = transcriptions.length;
    const closedCount = transcriptions.filter(t => t.closed).length;
    
    const motivations = transcriptions
      .filter(t => t.mainMotivation)
      .map(t => t.mainMotivation!)
      .reduce((acc, mot) => {
        acc[mot] = (acc[mot] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const allTechRequirements = transcriptions
      .filter(t => t.technicalRequirements && t.technicalRequirements.length > 0)
      .flatMap(t => t.technicalRequirements!);
    
    const techReqCounts = allTechRequirements.reduce((acc, req) => {
      acc[req] = (acc[req] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topMotivations = Object.entries(motivations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, API_CONSTANTS.LIMITS.TOP_RESULTS_MEDIUM)
      .map(([mot, count]) => `${mot}: ${count} clients`);
    
    const topTechReqs = Object.entries(techReqCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, API_CONSTANTS.LIMITS.TOP_RESULTS_MEDIUM)
      .map(([req, count]) => `${req}: ${count} mentions`);

    return `You are a business analyst for Vambe, a sales analytics platform. Analyze these client meeting transcripts to identify the MAIN SOLUTIONS and needs that clients are seeking.

Client Statistics:
- Total clients analyzed: ${totalClients}
- Closed deals: ${closedCount} (${((closedCount / totalClients) * 100).toFixed(1)}%)

Top Motivations (why clients seek Vambe):
${topMotivations.length > 0 ? topMotivations.join('\n') : 'No specific motivations identified'}

Top Technical Requirements:
${topTechReqs.length > 0 ? topTechReqs.join('\n') : 'No specific technical requirements identified'}

Sample Transcripts (${sampledTranscriptions.length} of ${totalClients}):
${sampledTranscriptions.map((t, idx) => `
Transcript ${idx + 1} (${t.closed ? 'CLOSED' : 'NOT CLOSED'}):
${t.transcription.substring(0, LLM_CONSTANTS.TRANSCRIPTION_TRUNCATE.SHORT)}${t.transcription.length > LLM_CONSTANTS.TRANSCRIPTION_TRUNCATE.SHORT ? '...' : ''}
`).join('\n---\n')}

Based on these transcripts, identify the MAIN SOLUTIONS that clients are seeking from Vambe. Focus on:
1. What problems are they trying to solve?
2. What capabilities or features are they most interested in?
3. What outcomes are they hoping to achieve?

Provide a brief, actionable insight (2-3 sentences maximum). Be SPECIFIC and mention actual solutions, needs, or capabilities that clients mention. Include concrete examples when possible.

IMPORTANT: Your insight MUST:
1. Identify the 2-3 most common solutions or needs that clients seek
2. Mention specific solutions/capabilities by name (e.g., "automation", "real-time responses", "multi-language support")
3. Relate solutions to client motivations and technical requirements when relevant
4. Provide one actionable recommendation for the sales team

Be specific and concrete. Name actual solutions and cite specific motivations or requirements when available. Return ONLY the insight text, no bullet points or formatting. Be professional and actionable.`;
  }
}

