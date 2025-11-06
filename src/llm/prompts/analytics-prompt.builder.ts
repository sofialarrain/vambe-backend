export class AnalyticsPromptBuilder {
  static buildPainPointsInsight(painPoints: Array<{
    painPoint: string;
    count: number;
    conversionRate: number;
  }>): string {
    const topPainPoints = painPoints.slice(0, 5);
    const totalMentions = painPoints.reduce((sum, pp) => sum + pp.count, 0);
    const avgConversionRate = painPoints.reduce((sum, pp) => sum + pp.conversionRate, 0) / painPoints.length;
    const topPainPoint = topPainPoints[0];

    return `You are a business analyst. Analyze these client pain points and provide a brief, actionable insight (2-3 sentences maximum). Be SPECIFIC and mention actual pain point names and numbers.

Top Pain Points Summary:
${topPainPoints.map((pp, idx) => `${idx + 1}. ${pp.painPoint}: ${pp.count} mentions, ${pp.conversionRate.toFixed(1)}% conversion rate`).join('\n')}

Overall Statistics:
- Total unique pain points: ${painPoints.length}
- Total mentions: ${totalMentions}
- Average conversion rate: ${avgConversionRate.toFixed(1)}%

IMPORTANT: Your insight MUST include:
1. Name the most common pain point (e.g., "${topPainPoint?.painPoint || 'N/A'}" with ${topPainPoint?.count || 0} mentions)
2. Mention 2-3 specific pain points from the top list with their mention counts
3. Include actual numbers (mention counts and conversion rates)
4. Provide one actionable recommendation based on the most critical pain points

Be specific and concrete. Name actual pain points and cite specific numbers. Return ONLY the insight text, no bullet points or formatting. Be professional and actionable.`;
  }

  static buildVolumeVsConversionInsight(volumeData: Array<{
    volumeRange: string;
    count: number;
    conversionRate: number;
  }>): string {
    const validData = volumeData.filter(v => v.count > 0);
    const topVolumeRange = validData.reduce((max, current) => 
      current.conversionRate > max.conversionRate ? current : max
    );
    const mostCommonRange = validData.reduce((max, current) => 
      current.count > max.count ? current : max
    );
    const totalClients = validData.reduce((sum, v) => sum + v.count, 0);
    const avgConversionRate = validData.reduce((sum, v) => sum + v.conversionRate, 0) / validData.length;

    return `You are a business analyst. Analyze this volume vs conversion data and provide a brief, actionable insight (2-3 sentences maximum). Be SPECIFIC and mention actual volume ranges, conversion rates, client counts, and numbers.

Volume vs Conversion Summary:
${validData.map((v, idx) => `${idx + 1}. Volume ${v.volumeRange}: ${v.count} clients (${((v.count / totalClients) * 100).toFixed(1)}% of total), ${v.conversionRate.toFixed(1)}% conversion rate`).join('\n')}

Overall Statistics:
- Total clients analyzed: ${totalClients}
- Average conversion rate: ${avgConversionRate.toFixed(1)}%
- Highest conversion rate: ${topVolumeRange.volumeRange} range with ${topVolumeRange.conversionRate.toFixed(1)}% (${topVolumeRange.count} clients)
- Most common volume range: ${mostCommonRange.volumeRange} with ${mostCommonRange.count} clients (${((mostCommonRange.count / totalClients) * 100).toFixed(1)}% of total) and ${mostCommonRange.conversionRate.toFixed(1)}% conversion rate

IMPORTANT: Your insight MUST include:
1. Identify the volume range with the highest conversion rate and mention how many clients it represents (e.g., "The ${topVolumeRange.volumeRange} volume range shows the highest conversion rate at ${topVolumeRange.conversionRate.toFixed(1)}% with ${topVolumeRange.count} clients")
2. Analyze the relationship between client volume distribution and conversion rates - consider both WHERE most clients are concentrated AND which ranges have the best conversion rates
3. Mention specific client counts AND conversion rates for the most relevant ranges (especially the most common range and highest converting range)
4. Provide one actionable recommendation that considers BOTH the volume distribution (where clients currently are) AND conversion potential (where they should be targeted)

Be specific and concrete. Name actual volume ranges, cite specific client counts, percentages, and conversion rates. Analyze the trade-off between having many clients in a range vs. having high conversion rates. Return ONLY the insight text, no bullet points or formatting. Be professional and actionable.`;
  }

  static buildTimelineInsight(timelineData: Array<{
    month: string;
    totalMeetings: number;
    totalClosed: number;
    conversionRate: number;
    avgSentiment?: string;
    topIndustries?: Array<{ industry: string; count: number; sentiment: string }>;
  }>): string {
    const recentMonths = timelineData.slice(-4);
    const previousMonths = timelineData.slice(0, -4);
    
    const recentAvgMeetings = recentMonths.reduce((sum, m) => sum + m.totalMeetings, 0) / recentMonths.length;
    const recentAvgClosed = recentMonths.reduce((sum, m) => sum + m.totalClosed, 0) / recentMonths.length;
    const recentAvgConversion = recentMonths.reduce((sum, m) => sum + m.conversionRate, 0) / recentMonths.length;
    
    const previousAvgMeetings = previousMonths.length > 0 
      ? previousMonths.reduce((sum, m) => sum + m.totalMeetings, 0) / previousMonths.length 
      : recentAvgMeetings;
    const previousAvgClosed = previousMonths.length > 0
      ? previousMonths.reduce((sum, m) => sum + m.totalClosed, 0) / previousMonths.length
      : recentAvgClosed;
    const previousAvgConversion = previousMonths.length > 0
      ? previousMonths.reduce((sum, m) => sum + m.conversionRate, 0) / previousMonths.length
      : recentAvgConversion;

    const meetingsChange = ((recentAvgMeetings - previousAvgMeetings) / previousAvgMeetings) * 100;
    const closedChange = ((recentAvgClosed - previousAvgClosed) / previousAvgClosed) * 100;
    const conversionChange = recentAvgConversion - previousAvgConversion;

    return `You are a business analyst for Vambe, a sales analytics platform. Analyze these recent sales timeline trends and provide structured insights. Focus on RECENT CHANGES and CURRENT TRENDS. Do NOT analyze data from 6+ months ago. Be SPECIFIC about which months show changes and possible reasons.

Recent Months Data (${recentMonths.length} most recent months):
${recentMonths.map((m, idx) => `
${m.month}:
- Total Meetings: ${m.totalMeetings}
- Total Closed: ${m.totalClosed}
- Conversion Rate: ${m.conversionRate.toFixed(1)}%
${m.avgSentiment ? `- Average Sentiment: ${m.avgSentiment}` : ''}
${m.topIndustries && m.topIndustries.length > 0 ? `- Top Industries: ${m.topIndustries.slice(0, 3).map(ind => `${ind.industry} (${ind.count} clients, ${ind.sentiment} sentiment)`).join(', ')}` : ''}
`).join('\n---\n')}

Trend Analysis:
- Meetings: ${meetingsChange >= 0 ? '+' : ''}${meetingsChange.toFixed(1)}% change (recent avg: ${recentAvgMeetings.toFixed(1)} vs previous: ${previousAvgMeetings.toFixed(1)})
- Closures: ${closedChange >= 0 ? '+' : ''}${closedChange.toFixed(1)}% change (recent avg: ${recentAvgClosed.toFixed(1)} vs previous: ${previousAvgClosed.toFixed(1)})
- Conversion Rate: ${conversionChange >= 0 ? '+' : ''}${conversionChange.toFixed(1)}% change (recent avg: ${recentAvgConversion.toFixed(1)}% vs previous: ${previousAvgConversion.toFixed(1)}%)

Return your response as a JSON object with exactly these keys:
- "keyFindings": Array of 2-3 key findings (each should be 1-2 sentences, be specific about months and numbers)
- "reasons": Array of 2-3 possible reasons for the changes (be specific, mention industries or sentiment patterns)
- "recommendations": Array of 2-3 actionable recommendations (focus on what to do NOW)

Each array item should be a string. Be concise and specific. Use actual month names and numbers.

Return ONLY valid JSON, no additional text, no markdown formatting. Example format:
{
  "keyFindings": ["Finding 1 with specific months/numbers", "Finding 2"],
  "reasons": ["Reason 1", "Reason 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}`;
  }
}

