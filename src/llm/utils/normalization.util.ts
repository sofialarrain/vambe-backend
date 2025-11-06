export class NormalizationUtil {
  static normalizeOperationSize(size: string): string {
    const normalized = size?.toLowerCase();
    if (['small', 'medium', 'large'].includes(normalized)) {
      return normalized;
    }
    return 'medium';
  }

  static normalizeUrgencyLevel(level: string): string {
    const normalized = level?.toLowerCase();
    if (['immediate', 'planned', 'exploratory'].includes(normalized)) {
      return normalized;
    }
    return 'planned';
  }

  static normalizeSentiment(sentiment: string): string {
    const normalized = sentiment?.toLowerCase();
    if (['positive', 'neutral', 'skeptical'].includes(normalized)) {
      return normalized;
    }
    return 'neutral';
  }
}

