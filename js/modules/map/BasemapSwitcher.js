/**
 * BasemapSwitcher - 底圖切換管理器
 * 
 * 管理地圖底圖樣式的切換（mono/light/satellite）
 */

class BasemapSwitcher {
  constructor(map, eventBus = null) {
    this.map = map;
    this.eventBus = eventBus;
    this.currentStyle = 'mono'; // 默認單色底圖
    
    // Mapbox 樣式 URL 映射
    this.styleMap = {
      mono: 'mapbox://styles/mapbox/light-v11', // 單色底圖（淺色，標籤會被隱藏）
      light: 'mapbox://styles/mapbox/light-v11', // 淺色底圖（與 mono 相同）
      satellite: 'mapbox://styles/mapbox/satellite-v9' // 衛星底圖
    };
    
    // 設置初始樣式（在地圖加載後檢測）
    if (this.map) {
      if (this.map.loaded()) {
        this.detectCurrentStyle();
      } else {
        this.map.once('load', () => {
          this.detectCurrentStyle();
        });
      }
    }
  }

  /**
   * 切換底圖樣式
   * @param {string} style - 樣式名稱 ('mono', 'light', 'satellite')
   */
  switchStyle(style) {
    if (!this.map) {
      console.warn('Map not initialized');
      return;
    }

    if (!this.styleMap[style]) {
      console.warn(`Unknown style: ${style}`);
      return;
    }

    const styleUrl = this.styleMap[style];
    
    // 如果當前樣式相同，不執行切換
    if (this.currentStyle === style) {
      return;
    }

    try {
      // 保存當前地圖狀態（中心點、縮放級別、投影）
      const center = this.map.getCenter();
      const zoom = this.map.getZoom();
      const bearing = this.map.getBearing();
      const pitch = this.map.getPitch();
      const projection = this.map.getProjection ? this.map.getProjection().name : 'globe';

      // 切換樣式
      this.map.setStyle(styleUrl);
      this.currentStyle = style;

      // 等待樣式加載完成後恢復地圖狀態
      this.map.once('style.load', () => {
        // 恢復地圖狀態
        this.map.setCenter(center);
        this.map.setZoom(zoom);
        if (bearing !== undefined) {
          this.map.setBearing(bearing);
        }
        if (pitch !== undefined) {
          this.map.setPitch(pitch);
        }
        
        // 恢復 Globe 投影（如果之前使用）
        if (projection === 'globe' && this.map.setProjection) {
          setTimeout(() => {
            this.map.setProjection('globe');
          }, 100);
        }

        // 觸發事件
        if (this.eventBus) {
          this.eventBus.emit('basemap:switched', { style, styleUrl });
        }
      });

      console.log(`Basemap switched to: ${style}`);
    } catch (error) {
      console.error('Failed to switch basemap:', error);
    }
  }

  /**
   * 檢測當前樣式
   */
  detectCurrentStyle() {
    if (!this.map || !this.map.loaded()) {
      return;
    }

    try {
      const styleUrl = this.map.getStyle().sprite || '';
      
      // 檢測當前樣式
      if (styleUrl.includes('light-v11')) {
        this.currentStyle = 'mono';
      } else if (styleUrl.includes('satellite-v9')) {
        this.currentStyle = 'satellite';
      }
    } catch (error) {
      console.debug('Failed to detect current style:', error);
    }
  }

  /**
   * 獲取當前樣式
   * @returns {string}
   */
  getCurrentStyle() {
    return this.currentStyle;
  }

  /**
   * 獲取所有可用的樣式
   * @returns {string[]}
   */
  getAvailableStyles() {
    return Object.keys(this.styleMap);
  }
}

// 導出類
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BasemapSwitcher;
} else if (typeof window !== 'undefined') {
  window.BasemapSwitcher = BasemapSwitcher;
}

