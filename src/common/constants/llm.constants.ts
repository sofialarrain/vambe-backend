/**
 * LLM Constants
 * 
 * Centralized constants for LLM/AI operations including token limits,
 * model configurations, and response processing limits.
 */
export const LLM_CONSTANTS = {
  /**
   * Default Anthropic model
   */
  DEFAULT_MODEL: 'claude-3-haiku-20240307',

  /**
   * Token limits for different types of prompts
   */
  MAX_TOKENS: {
    /**
     * Short responses (predictions, brief insights)
     */
    SHORT: 150,
    
    /**
     * Standard insights (pain points, volume analysis)
     */
    STANDARD: 200,
    
    /**
     * Medium insights (industry conversion, seller correlations)
     */
    MEDIUM: 250,
    
    /**
     * Extended insights (seller feedback, timeline analysis)
     */
    EXTENDED: 300,
    
    /**
     * Timeline insights (comprehensive analysis)
     */
    TIMELINE: 400,
    
    /**
     * Seller feedback (detailed recommendations)
     */
    SELLER_FEEDBACK: 512,
    
    /**
     * Client perception insights (comprehensive analysis)
     */
    CLIENT_PERCEPTION: 600,
    
    /**
     * Categorization (full transcription analysis)
     */
    CATEGORIZATION: 1024,
    
    /**
     * Default fallback token limit
     */
    DEFAULT: 1024,
  },

  /**
   * Substring lengths for logging purposes
   */
  LOG_SUBSTRING_LENGTH: {
    /**
     * Brief log preview
     */
    BRIEF: 100,
    
    /**
     * Standard log preview
     */
    STANDARD: 200,
  },

  /**
   * Transcription truncation limits for prompts
   */
  TRANSCRIPTION_TRUNCATE: {
    /**
     * Short transcription preview
     */
    SHORT: 400,
    
    /**
     * Medium transcription preview
     */
    MEDIUM: 500,
  },
} as const;

