/**
 * API Constants
 * 
 * Centralized constants for API operations including pagination,
 * HTTP status codes, and common API defaults.
 */
export const API_CONSTANTS = {
  /**
   * Pagination defaults
   */
  PAGINATION: {
    /**
     * Default page number
     */
    DEFAULT_PAGE: 1,
    
    /**
     * Default items per page
     */
    DEFAULT_LIMIT: 20,
  },

  /**
   * HTTP Status Codes (for reference and consistency)
   */
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },

  /**
   * Probability/Score defaults
   */
  PROBABILITY: {
    /**
     * Default fallback probability (50%)
     */
    DEFAULT_FALLBACK: 50,
    
    /**
     * Minimum probability value
     */
    MIN: 0,
    
    /**
     * Maximum probability value
     */
    MAX: 100,
  },

  /**
   * Time conversion constants
   */
  TIME: {
    /**
     * Milliseconds in one day
     */
    MILLISECONDS_PER_DAY: 86400000,
  },

  /**
   * Limits for data processing
   */
  LIMITS: {
    /**
     * Maximum number of top deals/clients to process
     */
    TOP_DEALS: 3,
    
    /**
     * Maximum recommendations to return
     */
    MAX_RECOMMENDATIONS: 3,
    
    /**
     * Sample size for transcript analysis
     */
    TRANSCRIPT_SAMPLE_SMALL: 10,
    TRANSCRIPT_SAMPLE_MEDIUM: 15,
    
    /**
     * Top results for various rankings
     */
    TOP_RESULTS_SHORT: 3,
    TOP_RESULTS_MEDIUM: 5,
  },
} as const;

