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
      performanceVsAvg?: number;
    }>;
  }): string {
    const industryCorrelations = sellerData.correlations
      .filter(c => c.dimension === 'industry')
      .sort((a, b) => b.successRate - a.successRate);
    
    const otherCorrelations = sellerData.correlations
      .filter(c => c.dimension !== 'industry')
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3);

    const industrySection = industryCorrelations.length > 0
      ? `\nIndustry Performance (MOST IMPORTANT - focus recommendations here):
${industryCorrelations.map(c => {
  const vsAvg = c.performanceVsAvg !== undefined 
    ? ` (${c.performanceVsAvg > 0 ? '+' : ''}${c.performanceVsAvg.toFixed(0)}% vs average)`
    : '';
  return `- ${c.value}: ${c.successRate}% success rate (${c.closed}/${c.total} deals)${vsAvg}`;
}).join('\n')}`
      : '\nNote: Limited industry data available for this seller.';

    const otherSection = otherCorrelations.length > 0
      ? `\nAdditional Context (mention only if relevant to industry recommendations):
${otherCorrelations.map(c => `- ${c.value} (${c.dimension}): ${c.successRate}% success rate`).join('\n')}`
      : '';

    return `You are a strategic sales analyst. Your goal is to help the company assign sellers to the RIGHT INDUSTRIES based on their proven strengths.

Seller: ${sellerData.seller}

Overall Performance:
- Total Clients: ${sellerData.metrics.total}
- Closed Deals: ${sellerData.metrics.closed}
- Conversion Rate: ${sellerData.metrics.conversionRate}%
${industrySection}${otherSection}

CRITICAL INSTRUCTIONS FOR RECOMMENDATIONS:
1. **PRIORITIZE INDUSTRIES**: Focus on specific industries where ${sellerData.seller} excels (e.g., "Technology", "Healthcare", "Logistics", "Finance")
2. **BE SPECIFIC**: Name actual industries from the data above, not generic categories
3. **AVOID REDUNDANCY**: Do NOT repeat obvious metrics about sentiment, urgency, or volume unless they reveal something unique about industry preferences
4. **ACTIONABLE ASSIGNMENT**: Help the company understand which industries to assign to ${sellerData.seller} going forward
5. **INDUSTRY INSIGHTS**: If ${sellerData.seller} shows strength in specific industries, explain WHY (e.g., "demonstrates expertise in technology sector", "excellent at closing logistics companies", "strong in healthcare vertical")

Example of GOOD recommendation:
- "Prioritize assigning ${sellerData.seller} to Technology and Finance industries, where they achieve 85% and 78% conversion rates respectively, significantly above company average. Their expertise in these sectors suggests strong industry knowledge and relationships."

Example of BAD recommendation (too generic):
- "Focus on positive sentiment clients" (this is redundant and not industry-specific)

Return ONLY a JSON array of 2-3 recommendations (strings), each focused on INDUSTRY ASSIGNMENT:
["recommendation 1 about specific industries", "recommendation 2 about industry strategy", "recommendation 3 if applicable"]`;
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

    const industryCorrelations = correlations.filter(c => c.dimension === 'industry');
    const otherCorrelations = correlations.filter(c => c.dimension !== 'industry');

    let industrySection = '';
    if (industryCorrelations.length > 0) {
      const topIndustries = industryCorrelations
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 3);
      
      industrySection = `\nINDUSTRY STRENGTHS (MOST IMPORTANT):
${topIndustries.map(c => {
  const vsAvg = c.performanceVsAvg > 0 
    ? ` (+${c.performanceVsAvg.toFixed(0)}% above average)`
    : '';
  return `- ${c.value}: ${c.successRate.toFixed(0)}% success rate (${c.closed}/${c.total} deals)${vsAvg}`;
}).join('\n')}`;
    }

    const otherSection = otherCorrelations.length > 0
      ? `\nAdditional Performance Context:
${otherCorrelations
  .sort((a, b) => b.successRate - a.successRate)
  .slice(0, 2)
  .map(c => {
    const dimensionLabel = dimensionLabels[c.dimension] || c.dimension;
    const vsAvg = c.performanceVsAvg > 0 
      ? ` (+${c.performanceVsAvg.toFixed(0)}% above average)`
      : '';
    return `- ${dimensionLabel}: ${c.value} - ${c.successRate.toFixed(0)}% success rate${vsAvg}`;
  }).join('\n')}`
      : '';

    return `You are a sales analytics expert. Write a concise, insightful description (2-3 sentences) for seller "${seller}" that PRIORITIZES INDUSTRY EXPERTISE.

${industrySection}${otherSection}

CRITICAL REQUIREMENTS:
1. **LEAD WITH INDUSTRIES**: Start by identifying which SPECIFIC industries this seller excels in (e.g., "Technology", "Healthcare", "Logistics", "Finance")
2. **BE SPECIFIC**: Name actual industries from the data above, use industry names explicitly
3. **EXPLAIN WHY**: If the seller shows strength in certain industries, suggest WHY (e.g., "demonstrates deep expertise in technology sector", "excellent at understanding logistics operations")
4. **AVOID GENERIC METRICS**: Don't just repeat sentiment, urgency, or volume metrics unless they reveal something unique about industry preferences
5. **STRATEGIC VALUE**: Help the company understand which industries to assign to this seller

Example of GOOD description:
"Boa demonstrates exceptional sales performance with Technology and Finance companies, achieving 70-85% success rates in these industries. This seller shows particular strength in understanding the complex needs of technology firms and financial institutions, suggesting deep industry knowledge and the ability to navigate technical requirements effectively."

Example of BAD description (too generic):
"Boa performs well with positive sentiment clients and medium-sized operations." (this doesn't mention industries)

Write a natural, conversational description focusing on INDUSTRY STRENGTHS. Keep it to 2-3 sentences maximum.`;
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

