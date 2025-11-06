/**
 * Analytics Constants
 * 
 * Centralized constants for analytics calculations and thresholds.
 * This improves maintainability and makes the code more readable.
 */
export const ANALYTICS_CONSTANTS = {
  /**
   * Minimum number of clients required for reliable statistical analysis
   */
  MIN_CLIENTS_FOR_RELIABILITY: 3,

  /**
   * Limits for top results
   */
  LIMITS: {
    TOP_SELLERS: 3,
    TOP_INDUSTRIES: 5,
    RECENT_WEEKS: 10,
  },

  /**
   * Decimal precision for percentages and rates
   */
  DECIMAL_PLACES: 2,

  /**
   * Percentile thresholds for data analysis
   */
  PERCENTILES: {
    LOW: 0.33,   // 33rd percentile
    HIGH: 0.67,  // 67th percentile
  },

  /**
   * Sentiment scoring thresholds
   */
  SENTIMENT: {
    POSITIVE_THRESHOLD: 2.5,
    SKEPTICAL_THRESHOLD: 1.5,
    POSITIVE_SCORE: 3,
  },

  /**
   * Urgency scoring thresholds
   */
  URGENCY: {
    IMMEDIATE_THRESHOLD: 2.5,
    EXPLORATORY_THRESHOLD: 1.5,
    IMMEDIATE_SCORE: 3,
  },

  /**
   * Conversion rate thresholds and fallbacks
   */
  CONVERSION: {
    HIGH_THRESHOLD_MIN: 60,      // Minimum high conversion threshold (%)
    LOW_THRESHOLD_MAX: 40,        // Maximum low conversion threshold (%)
    THRESHOLD_ADJUSTMENT: 5,      // Points to add/subtract for fallback
  },

  /**
   * Trend calculation thresholds
   */
  TREND: {
    DEFAULT_THRESHOLD: 0.1,       // 10% change threshold for normal trends
    HIGH_VARIANCE_THRESHOLD: 0.5,  // 50% change threshold when variance is high
    INCREASE_THRESHOLD: 5,        // 5% increase threshold for monthly trends
    DECREASE_THRESHOLD: -5,       // 5% decrease threshold for monthly trends
  },

  /**
   * Coefficient of variation threshold for variance analysis
   */
  VARIANCE: {
    LOW_VARIANCE_THRESHOLD: 0.3,  // 30% coefficient of variation
  },

  /**
   * Prediction weights for weighted average calculations
   * Weights are applied from most recent to oldest
   */
  PREDICTION_WEIGHTS: [0.1, 0.2, 0.3, 0.4] as const,

  /**
   * Time conversion factors
   */
  TIME: {
    WEEKS_PER_MONTH: 4,
  },

  /**
   * Year validation limits
   */
  YEAR: {
    MIN: 2000,
    MAX: 2100,
  },

  /**
   * Percentage multiplier for conversion rate calculations
   */
  PERCENTAGE_MULTIPLIER: 100,
} as const;

