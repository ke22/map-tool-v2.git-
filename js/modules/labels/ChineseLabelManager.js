/**
 * ChineseLabelManager - 中文標籤管理器
 * 
 * 使用 Natural Earth 數據和地名翻譯對照表來顯示繁體中文地名標籤
 */

class ChineseLabelManager {
  constructor(map, placeNameTranslator, eventBus = null) {
    this.map = map;
    this.translator = placeNameTranslator;
    this.eventBus = eventBus;
    this.sourceId = 'chinese-labels-source';
    this.layerId = 'chinese-labels-layer';
    this.initialized = false;
  }

  /**
   * 初始化中文標籤層
   */
  async initialize() {
    if (this.initialized || !this.map) {
      return;
    }

    // 等待地圖加載完成
    if (!this.map.loaded()) {
      this.map.once('load', () => this.initialize());
      return;
    }

    // 等待翻譯器加載完成
    if (!this.translator.isLoaded()) {
      await this.waitForTranslator();
    }

    try {
      // 加載 Natural Earth 數據
      await this.loadNaturalEarthData();
      this.initialized = true;
      
      if (this.eventBus) {
        this.eventBus.emit('chinese-labels:initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Chinese labels:', error);
    }
  }

  /**
   * 等待翻譯器加載完成
   */
  async waitForTranslator(maxWait = 10000) {
    const startTime = Date.now();
    while (!this.translator.isLoaded() && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.translator.isLoaded()) {
      console.warn('Place name translator not loaded after timeout');
    }
  }

  /**
   * 加載 Natural Earth 數據並創建中文標籤層
   */
  async loadNaturalEarthData() {
    const CONFIG = window.CONFIG || {};
    // 使用 Natural Earth 10m 國家邊界數據（簡化版本，文件較小）
    // 如果需要更詳細的數據，可以使用 ne_10m_admin_0_countries.geojson
    const naturalEarthUrl = CONFIG.PLACE_NAMES?.NATURAL_EARTH?.COUNTRIES_URL || 
                           'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson';
    
    console.log(`Loading Natural Earth data from: ${naturalEarthUrl}`);

    try {
      const response = await fetch(naturalEarthUrl);
      if (!response.ok) {
        throw new Error(`Failed to load Natural Earth data: ${response.statusText}`);
      }

      const geojson = await response.json();
      
      // 處理每個 Feature，添加中文名稱
      if (geojson.features && Array.isArray(geojson.features)) {
        geojson.features.forEach(feature => {
          if (!feature.properties) return;

          // 獲取英文名稱和 ISO code（優先使用 ISO_A3，因為 CSV 使用 3 位代碼）
          const isoCode = feature.properties.ISO_A3 || 
                         feature.properties.ADM0_A3 ||
                         feature.properties.ISO_A2 ||
                         feature.properties.ISO;
          
          const englishName = feature.properties.NAME || 
                             feature.properties.NAME_EN || 
                             feature.properties.NAME_LONG ||
                             feature.properties.ADMIN ||
                             feature.properties.NAME_SORT;

          // 嘗試翻譯為中文（優先使用 ISO code）
          let chineseName = null;
          if (isoCode) {
            // 先嘗試使用完整的 ISO code
            chineseName = this.translator.translate(isoCode);
            
            // 如果失敗，嘗試只使用前 3 位（ISO_A3 格式）
            if (!chineseName && isoCode.length > 3) {
              chineseName = this.translator.translate(isoCode.substring(0, 3));
            }
          }
          
          // 如果 ISO code 翻譯失敗，嘗試使用英文名稱
          if (!chineseName && englishName) {
            chineseName = this.translator.translate(englishName);
          }
          
          // 調試：如果仍然找不到翻譯，記錄詳細信息
          if (!chineseName && (isoCode || englishName)) {
            // 只在開發模式下輸出（避免日誌過多）
            if (window.CONFIG?.DEBUG) {
              console.log(`[ChineseLabelManager] No translation found:`, {
                isoCode,
                englishName,
                properties: Object.keys(feature.properties)
              });
            }
          }

          // 添加中文名稱到 properties
          if (chineseName) {
            feature.properties.name_zh_tw = chineseName;
            feature.properties.name_display = chineseName; // 用於顯示的字段
          } else {
            // 如果沒有翻譯，優先使用英文名稱，而不是 "Unknown"
            // 只有在完全沒有名稱信息時才使用 "Unknown"
            if (englishName) {
              feature.properties.name_display = englishName;
            } else if (isoCode) {
              feature.properties.name_display = isoCode;
            } else {
              // 最後的備選：使用 feature 的其他可能字段
              const fallbackName = feature.properties.ADMIN || 
                                 feature.properties.NAME_SORT || 
                                 feature.properties.NAME_ALT ||
                                 'Unknown';
              feature.properties.name_display = fallbackName;
            }
          }

          // 保留原始英文名稱
          feature.properties.name_en = englishName;
          feature.properties.iso_code = isoCode;
        });
      }

      // 創建或更新數據源
      if (this.map.getSource(this.sourceId)) {
        this.map.getSource(this.sourceId).setData(geojson);
      } else {
        this.map.addSource(this.sourceId, {
          type: 'geojson',
          data: geojson
        });
      }

      // 創建或更新標籤圖層
      if (this.map.getLayer(this.layerId)) {
        // 圖層已存在，更新即可
        return;
      }

      // 獲取所有圖層，找到合適的位置插入標籤圖層（應該在所有其他圖層之上）
      const layers = this.map.getStyle().layers;
      let beforeId = null;
      
      // 找到最後一個 symbol 圖層之後，或者最後一個圖層
      for (let i = layers.length - 1; i >= 0; i--) {
        if (layers[i].type === 'symbol' || layers[i].type === 'fill' || layers[i].type === 'line') {
          beforeId = layers[i].id;
          break;
        }
      }
      
      this.map.addLayer({
        id: this.layerId,
        type: 'symbol',
        source: this.sourceId,
        layout: {
          'text-field': ['get', 'name_display'], // 使用中文名稱
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            2, 10,  // 縮放級別 2 時，字體大小 10
            4, 12,  // 縮放級別 4 時，字體大小 12
            6, 14   // 縮放級別 6 時，字體大小 14
          ],
          'text-anchor': 'center',
          'text-offset': [0, 0],
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-optional': true
        },
        paint: {
          'text-color': '#333333',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
          'text-halo-blur': 1
        },
        minzoom: 2, // 只在縮放級別 2 以上顯示標籤
        maxzoom: 22
      }, beforeId); // 在指定圖層之前插入

      console.log(`Chinese labels layer created successfully with ${geojson.features?.length || 0} features`);
      
      // 觸發事件通知標籤已加載
      if (this.eventBus) {
        this.eventBus.emit('chinese-labels:loaded', { 
          featureCount: geojson.features?.length || 0,
          translatedCount: geojson.features?.filter(f => f.properties.name_zh_tw).length || 0
        });
      }
    } catch (error) {
      console.error('Failed to load Natural Earth data:', error);
      throw error;
    }
  }

  /**
   * 更新標籤可見性
   * @param {boolean} visible - 是否可見
   */
  setVisibility(visible) {
    if (!this.map || !this.map.getLayer(this.layerId)) {
      return;
    }

    this.map.setLayoutProperty(this.layerId, 'visibility', visible ? 'visible' : 'none');
  }

  /**
   * 更新標籤樣式
   * @param {Object} style - 樣式對象 {color, size, haloColor, haloWidth}
   */
  updateStyle(style = {}) {
    if (!this.map || !this.map.getLayer(this.layerId)) {
      return;
    }

    if (style.color !== undefined) {
      this.map.setPaintProperty(this.layerId, 'text-color', style.color);
    }
    if (style.size !== undefined) {
      this.map.setLayoutProperty(this.layerId, 'text-size', style.size);
    }
    if (style.haloColor !== undefined) {
      this.map.setPaintProperty(this.layerId, 'text-halo-color', style.haloColor);
    }
    if (style.haloWidth !== undefined) {
      this.map.setPaintProperty(this.layerId, 'text-halo-width', style.haloWidth);
    }
  }

  /**
   * 移除標籤層
   */
  remove() {
    if (!this.map) {
      return;
    }

    if (this.map.getLayer(this.layerId)) {
      this.map.removeLayer(this.layerId);
    }
    if (this.map.getSource(this.sourceId)) {
      this.map.removeSource(this.sourceId);
    }

    this.initialized = false;
  }
}

// 導出類
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChineseLabelManager;
} else if (typeof window !== 'undefined') {
  window.ChineseLabelManager = ChineseLabelManager;
}

