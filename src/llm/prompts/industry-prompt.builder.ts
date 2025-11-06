export class IndustryPromptBuilder {
  static buildDistributionInsight(industryData: Array<{
    value: string;
    count: number;
    closed: number;
    conversionRate: number;
  }>): string {
    const sortedData = [...industryData].sort((a, b) => b.count - a.count);
    const topIndustries = sortedData.slice(0, 5);
    const totalClients = industryData.reduce((sum, ind) => sum + ind.count, 0);
    const industriesWithOneClient = industryData.filter(ind => ind.count === 1).length;
    const industriesWithMultipleClients = industryData.filter(ind => ind.count >= 3).length;
    const topIndustry = topIndustries[0];

    return `You are a business analyst. Analyze this industry distribution data and provide a brief, actionable insight (2-3 sentences maximum). Be SPECIFIC and mention actual industry names and numbers.

Industry Distribution Summary:
- Total industries: ${industryData.length}
- Total clients: ${totalClients}
- Industries with only 1 client: ${industriesWithOneClient}
- Industries with 3+ clients: ${industriesWithMultipleClients}

Top 5 Industries by Volume:
${topIndustries.map((ind, idx) => `${idx + 1}. ${ind.value}: ${ind.count} clients`).join('\n')}

IMPORTANT: Your insight MUST include:
1. Name the industry with the most clients (e.g., "The industry with the most clients is ${topIndustry?.value || 'N/A'} with ${topIndustry?.count || 0} clients")
2. Mention specific industry names from the top 3-5 industries with their client counts
3. Focus on VOLUME and DISTRIBUTION - do NOT mention conversion rates (that's shown in a different chart)
4. Include actual numbers (client counts only)
5. Provide one actionable recommendation based on market concentration and distribution

Be specific and concrete. Do NOT use generic phrases like "certain industries" or "some sectors". Name actual industries and cite specific client counts. Do NOT mention conversion rates or percentages.

Return ONLY the insight text, no bullet points or formatting. Be professional and actionable.`;
  }

  static buildConversionInsight(industryData: Array<{
    value: string;
    count: number;
    closed: number;
    conversionRate: number;
  }>): string {
    const reliableIndustries = industryData.filter(ind => ind.count >= 3);
    const sortedByConversion = [...reliableIndustries].sort((a, b) => b.conversionRate - a.conversionRate);
    const topConverters = sortedByConversion.slice(0, 3);
    const bottomConverters = sortedByConversion.slice(-3).reverse();
    const avgConversionRate = reliableIndustries.reduce((sum, ind) => sum + ind.conversionRate, 0) / reliableIndustries.length;
    const topIndustry = topConverters[0];
    const lowestIndustry = bottomConverters[0];

    return `You are a business analyst. Analyze this industry conversion rate data and provide a brief, actionable insight (2-3 sentences maximum). Be SPECIFIC and mention actual industry names and conversion rates.

Conversion Rate Analysis:
- Total industries analyzed: ${reliableIndustries.length} (with at least 3 clients)
- Average conversion rate: ${avgConversionRate.toFixed(1)}%

Top 3 Industries by Conversion Rate:
${topConverters.map((ind, idx) => `${idx + 1}. ${ind.value}: ${ind.conversionRate.toFixed(1)}% (${ind.closed}/${ind.count} clients)`).join('\n')}

Bottom 3 Industries by Conversion Rate:
${bottomConverters.map((ind, idx) => `${idx + 1}. ${ind.value}: ${ind.conversionRate.toFixed(1)}% (${ind.closed}/${ind.count} clients)`).join('\n')}

IMPORTANT: Your insight MUST include:
1. Name the industry with the highest conversion rate (e.g., "${topIndustry?.value || 'N/A'} has the highest conversion rate at ${topIndustry?.conversionRate.toFixed(1) || 0}%")
2. Mention specific industry names and their conversion rates
3. Highlight opportunities or concerns (e.g., industries with high conversion but low volume, or industries with low conversion that need attention)
4. Include actual numbers (conversion percentages, client counts)
5. Provide one actionable recommendation

Be specific and concrete. Do NOT use generic phrases. Name actual industries and cite specific conversion rates and numbers.

Return ONLY the insight text, no bullet points or formatting. Be professional and actionable.`;
  }
}

