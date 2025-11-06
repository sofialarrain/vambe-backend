export class SellerPromptBuilder {
  static buildFeedback(sellerData: {
    seller: string;
    metrics: { total: number; closed: number; conversionRate: number };
    correlations: Array<{
      dimension: string;
      value: string;
      total: number;
      closed: number;
      successRate: number;
    }>;
  }): string {
    const topCorrelations = sellerData.correlations
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    return `You are a sales performance analyst. Analyze this seller's performance and provide actionable recommendations.

Seller: ${sellerData.seller}

Overall Metrics:
- Total Clients: ${sellerData.metrics.total}
- Closed Deals: ${sellerData.metrics.closed}
- Conversion Rate: ${sellerData.metrics.conversionRate}%

Top Performance Areas:
${topCorrelations.map(c => `- ${c.value} (${c.dimension}): ${c.successRate}% success rate (${c.closed}/${c.total} deals)`).join('\n')}

Provide 2-3 specific, actionable recommendations for ${sellerData.seller}. Focus on:
1. Leveraging their strongest areas
2. Targeting specific client types where they excel
3. Specific actions they can take

Return ONLY a JSON array of recommendations (strings), no additional text:
["recommendation 1", "recommendation 2", "recommendation 3"]`;
  }

  static buildCorrelationInsight(
    seller: string,
    correlations: Array<{
      dimension: string;
      value: string;
      successRate: number;
      closed: number;
      total: number;
      performanceVsAvg: number;
    }>
  ): string {
    const dimensionLabels: Record<string, string> = {
      industry: 'Industry',
      operationSize: 'Operation Size',
      urgencyLevel: 'Urgency Level',
      sentiment: 'Sentiment',
      discoverySource: 'Discovery Source',
    };

    const correlationDescriptions = correlations.map(corr => {
      const dimensionLabel = dimensionLabels[corr.dimension] || corr.dimension;
      const performanceNote = corr.performanceVsAvg > 0 
        ? ` (${corr.performanceVsAvg > 0 ? '+' : ''}${corr.performanceVsAvg.toFixed(0)}% above average)`
        : '';
      return `- ${dimensionLabel}: ${corr.value} - ${corr.successRate.toFixed(0)}% success rate (${corr.closed}/${corr.total} deals)${performanceNote}`;
    }).join('\n');

    return `You are a sales analytics expert. Based on the following correlation data for seller "${seller}", write a concise, insightful description (2-3 sentences) that:

1. Identifies the seller's key strengths and where they excel
2. Describes the TYPE of client profile where this seller performs best
3. Uses natural language, not just numbers
4. Focuses on actionable insights (e.g., "Boa excels with technology companies that have large operations and planned implementations")

Correlation Data:
${correlationDescriptions}

Write a natural, conversational description that tells a story about this seller's expertise. Example format: "Boa demonstrates exceptional success with technology companies that operate at a large scale. These clients typically have planned implementations rather than urgent needs, suggesting Boa's strength lies in strategic, long-term sales cycles. With a 100% close rate in this segment, Boa should be prioritized for similar client profiles."

Keep it to 2-3 sentences maximum.`;
  }

  static buildTimelineInsight(
    sellerStats: Array<{
      seller: string;
      total: number;
      trend: string;
      changePercent: number;
      avgPerPeriod: number;
    }>,
    granularity: 'week' | 'month'
  ): string {
    return `You are analyzing sales performance data for multiple sellers over time. Based on the following statistics, provide a brief, insightful analysis (2-3 sentences) highlighting key trends and notable performers.

Data granularity: ${granularity}

Seller Statistics:
${sellerStats.map(s => 
  `- ${s.seller}: Total ${s.total} deals, Average ${s.avgPerPeriod.toFixed(1)} per ${granularity}, Trend: ${s.trend} (${s.changePercent.toFixed(0)}% change)`
).join('\n')}

Provide a concise analysis focusing on:
1. Who shows the strongest growth/improvement
2. Who leads in total performance
3. Any concerning trends or opportunities
4. Keep it natural and conversational, mention specific seller names and numbers

Write your analysis in English, maximum 3 sentences.`;
  }
}

