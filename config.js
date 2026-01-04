/**
 * Map Tool v2 - Configuration File
 * 
 * This file contains all configuration settings for the workflow-based map tool v2.
 * Update these values according to your needs.
 * 
 * IMPORTANT: Never commit this file with real tokens to public repositories!
 */

const CONFIG = {
  /**
   * Mapbox Configuration
   * Get your access token from: https://account.mapbox.com/
   */
  MAPBOX: {
    // Your Mapbox public access token
    // Can be set via environment variable MAPBOX_TOKEN in .env file
    // Falls back to hardcoded token if not set
    TOKEN: (typeof window !== 'undefined' && window.MAPBOX_TOKEN) || process.env.MAPBOX_TOKEN || 'pk.eyJ1IjoiY25hZ3JhcGhpY2Rlc2lnbiIsImEiOiJjbHRxbXlnc28wODF6Mmltb2Rjb3g5a25kIn0.x73wo3gKurL6CivFUOjVeg',
    
    // Mapbox style URL
    // Options:
    // - 'mapbox://styles/mapbox/light-v11' (light theme)
    // - 'mapbox://styles/mapbox/dark-v11' (dark theme)
    // - 'mapbox://styles/mapbox/streets-v12' (streets)
    // - 'mapbox://styles/mapbox/satellite-v9' (satellite)
    STYLE: 'mapbox://styles/mapbox/light-v11',
  },

  /**
   * Default Map Settings
   */
  MAP: {
    // Default center [lng, lat]
    DEFAULT_CENTER: [121.5654, 25.0330], // Taipei
    
    // Default zoom level
    DEFAULT_ZOOM: 2,
    
    // Min/Max zoom levels
    MIN_ZOOM: 0,
    MAX_ZOOM: 22,
  },

  /**
   * Gemini AI Configuration
   * Get your API key from: https://aistudio.google.com/app/apikey
   */
  GEMINI: {
    // Enable/disable AI features
    ENABLED: true,
    
    // Use backend proxy (recommended for production)
    USE_BACKEND_PROXY: true,
    
    // Backend proxy endpoint
    PROXY_ENDPOINT: '/api/gemini/generateContent',
    
    // Direct API key (only for development, never commit!)
    API_KEY: process.env.GEMINI_API_KEY || '',
  },

  /**
   * Workflow Configuration
   */
  WORKFLOW: {
    // Default stage
    DEFAULT_STAGE: 'country',
    
    // Enable stage skipping
    ALLOW_STAGE_SKIP: true,
    
    // Enable stage navigation (back to previous stages)
    ALLOW_STAGE_NAVIGATION: true,
  },

  /**
   * Export Configuration
   */
  EXPORT: {
    // Default export format
    DEFAULT_FORMAT: 'png',
    
    // Default DPI
    DEFAULT_DPI: 300,
    
    // Supported formats
    FORMATS: ['png', 'jpg'],
    
    // Supported DPI values
    DPI_OPTIONS: [150, 300, 600],
  },
};

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}

