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
    TOKEN: (typeof window !== 'undefined' && window.MAPBOX_TOKEN) || (typeof process !== 'undefined' && process.env && process.env.MAPBOX_TOKEN) || 'pk.eyJ1IjoiY25hZ3JhcGhpY2Rlc2lnbiIsImEiOiJjbHRxbXlnc28wODF6Mmltb2Rjb3g5a25kIn0.x73wo3gKurL6CivFUOjVeg',
    
    // Mapbox style URL（默認底圖）
    // 注意：實際使用的底圖由 BasemapSwitcher 管理
    // 這裡設置的是初始樣式，建議使用 light-v11（單色底圖，無標籤）
    STYLE: 'mapbox://styles/mapbox/light-v11', // 默認單色底圖
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
    
    // 使用的模型
    MODEL: 'gemini-2.0-flash', // 快速響應模型
    
    // API 基礎 URL
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    
    // 請求超時時間（毫秒）
    TIMEOUT: 30000,
    
    // Direct API key (only for development, never commit!)
    API_KEY: (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) || '',
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
    
    // JPEG quality (0-1)
    JPG_QUALITY: 0.9,
    
    // Scale factor for high resolution
    SCALE: 2,
    
    // Filename prefix
    FILENAME_PREFIX: 'map',
    
    // Include timestamp in filename
    INCLUDE_TIMESTAMP: true,
    
    // Export timeout (ms)
    TIMEOUT: 30000,
    
    // Default DPI
    DEFAULT_DPI: 300,
    
    // Supported formats
    FORMATS: ['png', 'jpg'],
    
    // Supported DPI values
    DPI_OPTIONS: [72, 150, 300, 600],
    
    // Maximum dimension to prevent browser crash
    MAX_DIMENSION: 8000,
  },

  /**
   * GADM Data Configuration
   * GADM (Global Administrative Areas) data path configuration
   */
  GADM: {
    // GADM 數據基礎路徑
    // 使用相對路徑，數據文件在項目目錄的 data/gadm/ 下
    // 使用合併文件格式：gadm_level0.geojson, gadm_level1.geojson, gadm_level2.geojson
    BASE_URL: 'data/gadm',
    
    // 是否啟用數據可用性檢查
    CHECK_DATA_EXISTS: true,
    
    // 數據結構類型
    // 'country-dirs': 每個國家一個目錄（countries/{COUNTRY}/{COUNTRY}_0.geojson）
    // 'merged-files': 合併的文件（gadm_level0.geojson, gadm_level1.geojson, gadm_level2.geojson）
    DATA_STRUCTURE: 'merged-files', // 使用合併文件格式
  },

  /**
   * Place Name Translation Configuration
   * 地名翻譯配置（英文 -> 繁體中文）
   */
  PLACE_NAMES: {
    // 翻譯對照表文件路徑（CSV 或 GeoJSON）
    TRANSLATIONS_URL: 'data/place-names/translations.csv',
    
    // 是否自動加載翻譯對照表
    AUTO_LOAD: true,
    
    // Natural Earth 數據配置
    NATURAL_EARTH: {
      // Natural Earth 數據基礎 URL
      // 可以使用本地文件或 CDN
      BASE_URL: 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA',
      
      // 國家邊界數據（10m 精度）
      COUNTRIES_URL: 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
      
      // 或者使用本地文件
      // COUNTRIES_URL: 'data/natural-earth/ne_10m_admin_0_countries.geojson',
      
      // 是否啟用中文標籤顯示
      ENABLE_CHINESE_LABELS: true,
    },
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



