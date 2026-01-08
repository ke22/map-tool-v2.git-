/**
 * ExportManager - 地圖導出管理器
 * 
 * 處理地圖圖片的導出功能，支持多種紙張尺寸、DPI、格式等選項
 */

// 紙張尺寸定義（單位：mm）
const PAPER_SIZES = {
  'custom': null, // 使用當前視圖
  'a4': { width: 210, height: 297 },
  'a3': { width: 297, height: 420 },
  'a2': { width: 420, height: 594 },
  'letter': { width: 215.9, height: 279.4 },
  'legal': { width: 215.9, height: 355.6 },
  'tabloid': { width: 279.4, height: 431.8 }
};

/**
 * 將 mm 轉換為像素（根據 DPI）
 */
function mmToPixels(mm, dpi) {
  return Math.round((mm / 25.4) * dpi);
}

/**
 * 計算比例尺
 */
function calculateScaleBar(map) {
  if (!map) return null;
  
  const zoom = map.getZoom();
  const center = map.getCenter();
  const lat = center.lat;
  const canvas = map.getCanvas();
  const width = canvas.width;
  
  // Calculate meters per pixel
  // This formula accounts for latitude (Mercator projection distortion)
  const metersPerPixel = (156543.03392 * Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom);
  
  // Target scale bar width in pixels (about 20% of canvas width)
  const targetPixels = width * 0.2;
  const targetMeters = targetPixels * metersPerPixel;
  
  // Round to nice numbers
  let distance = 1;
  let unit = 'm';
  
  if (targetMeters >= 1000) {
    distance = Math.round(targetMeters / 1000);
    unit = 'km';
  } else if (targetMeters >= 100) {
    distance = Math.round(targetMeters / 100) * 100;
  } else if (targetMeters >= 10) {
    distance = Math.round(targetMeters / 10) * 10;
  } else {
    distance = Math.round(targetMeters);
  }
  
  const pixels = (distance * (unit === 'km' ? 1000 : 1)) / metersPerPixel;
  
  return { distance, unit, pixels };
}

class ExportManager {
  constructor(map, eventBus = null, logger = null) {
    this.map = map;
    this.eventBus = eventBus;
    this.logger = logger;
    this.PAPER_SIZES = PAPER_SIZES;
  }

  /**
   * 導出地圖圖片
   * @param {Object} settings - 導出設置 {paperSize, orientation, dpi, format, quality}
   */
  async exportMap(settings = {}) {
    const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
    const exportConfig = CONFIG.EXPORT || {};
    
    const defaultSettings = {
      paperSize: 'custom',
      orientation: 'portrait',
      dpi: exportConfig.DEFAULT_DPI || 300,
      format: exportConfig.DEFAULT_FORMAT || 'png',
      quality: exportConfig.JPG_QUALITY || 0.9
    };
    
    settings = { ...defaultSettings, ...settings };
    
    if (!this.map || !this.map.loaded()) {
      throw new Error('Map is not fully loaded');
    }
    
    if (this.logger) {
      this.logger.info('Exporting map with settings:', settings);
    }
    
    // 計算目標尺寸
    let targetWidth, targetHeight;
    
    if (settings.paperSize === 'custom') {
      const mapCanvas = this.map.getCanvas();
      targetWidth = mapCanvas.clientWidth;
      targetHeight = mapCanvas.clientHeight;
    } else {
      const size = PAPER_SIZES[settings.paperSize];
      if (!size) {
        throw new Error(`Unknown paper size: ${settings.paperSize}`);
      }
      targetWidth = mmToPixels(size.width, settings.dpi);
      targetHeight = mmToPixels(size.height, settings.dpi);
      
      if (settings.orientation === 'landscape') {
        [targetWidth, targetHeight] = [targetHeight, targetWidth];
      }
    }
    
    // 限制最大尺寸
    const maxDimension = exportConfig.MAX_DIMENSION || 8000;
    targetWidth = Math.min(targetWidth, maxDimension);
    targetHeight = Math.min(targetHeight, maxDimension);
    
    // 存儲原始狀態
    const mapContainer = this.map.getContainer();
    const originalWidth = mapContainer.clientWidth;
    const originalHeight = mapContainer.clientHeight;
    const originalCenter = this.map.getCenter();
    const originalZoom = this.map.getZoom();
    
    const restoreMap = () => {
      mapContainer.style.position = '';
      mapContainer.style.top = '';
      mapContainer.style.left = '';
      mapContainer.style.zIndex = '';
      mapContainer.style.width = originalWidth + 'px';
      mapContainer.style.height = originalHeight + 'px';
      this.map.resize();
      if (originalCenter && originalZoom) {
        this.map.setCenter(originalCenter);
        this.map.setZoom(originalZoom);
      }
    };
    
    try {
      if (settings.paperSize === 'custom') {
        // 使用當前畫布尺寸
        return await this._exportCurrentCanvas(settings, restoreMap);
      } else {
        // 調整尺寸以高分辨率渲染
        return await this._exportWithResize(targetWidth, targetHeight, settings, restoreMap);
      }
    } catch (error) {
      restoreMap();
      if (this.logger) {
        this.logger.error('Export failed:', error);
      }
      throw error;
    }
  }

  /**
   * 導出當前畫布（自定義尺寸）
   */
  async _exportCurrentCanvas(settings, restoreMap) {
    return new Promise((resolve, reject) => {
      this.map.once('render', () => {
        try {
          const mapCanvas = this.map.getCanvas();
          const canvasWidth = mapCanvas.clientWidth || mapCanvas.width;
          const canvasHeight = mapCanvas.clientHeight || mapCanvas.height;
          
          if (canvasWidth === 0 || canvasHeight === 0) {
            reject(new Error('Map canvas has zero dimensions'));
            return;
          }
          
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = canvasWidth;
          exportCanvas.height = canvasHeight;
          const ctx = exportCanvas.getContext('2d');
          
          // Fill white background first (in case map has transparency)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // Draw the map canvas onto export canvas
          ctx.drawImage(mapCanvas, 0, 0, canvasWidth, canvasHeight);
          
          const mimeType = settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = settings.format === 'jpeg' ? settings.quality : undefined;
          
          exportCanvas.toBlob((blob) => {
            if (!blob || blob.size === 0) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            const filename = this._generateFilename(settings);
            this._downloadBlob(blob, filename);
            
            if (this.eventBus) {
              this.eventBus.emit('map:exported', { filename, settings });
            }
            
            resolve(filename);
          }, mimeType, quality);
        } catch (error) {
          reject(error);
        }
      });
      
      this.map.triggerRepaint();
    });
  }

  /**
   * 調整尺寸後導出（紙張尺寸）
   */
  async _exportWithResize(targetWidth, targetHeight, settings, restoreMap) {
    const mapContainer = this.map.getContainer();
    
    // 臨時調整容器尺寸（移到屏幕外以避免閃爍）
    mapContainer.style.position = 'absolute';
    mapContainer.style.top = '-9999px';
    mapContainer.style.left = '-9999px';
    mapContainer.style.zIndex = '-1';
    mapContainer.style.width = targetWidth + 'px';
    mapContainer.style.height = targetHeight + 'px';
    this.map.resize();
    
    return new Promise((resolve, reject) => {
      this.map.once('render', () => {
        try {
          const mapCanvas = this.map.getCanvas();
          
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = targetWidth;
          exportCanvas.height = targetHeight;
          const ctx = exportCanvas.getContext('2d');
          
          // Fill white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          
          // Draw map canvas
          ctx.drawImage(mapCanvas, 0, 0, targetWidth, targetHeight);
          
          const mimeType = settings.format === 'jpeg' ? 'image/jpeg' : 'image/png';
          const quality = settings.format === 'jpeg' ? settings.quality : undefined;
          
          exportCanvas.toBlob((blob) => {
            restoreMap();
            
            if (!blob || blob.size === 0) {
              reject(new Error('Failed to create blob'));
              return;
            }
            
            const filename = this._generateFilename(settings);
            this._downloadBlob(blob, filename);
            
            if (this.eventBus) {
              this.eventBus.emit('map:exported', { filename, settings });
            }
            
            resolve(filename);
          }, mimeType, quality);
        } catch (error) {
          restoreMap();
          reject(error);
        }
      });
      
      this.map.triggerRepaint();
    });
  }

  /**
   * 生成文件名
   */
  _generateFilename(settings) {
    const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
    const exportConfig = CONFIG.EXPORT || {};
    const prefix = exportConfig.FILENAME_PREFIX || 'map';
    
    let name = `${prefix}-${settings.paperSize}`;
    
    if (exportConfig.INCLUDE_TIMESTAMP !== false) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      name += `-${timestamp}`;
    }
    
    const extension = settings.format === 'jpeg' ? 'jpg' : 'png';
    return `${name}.${extension}`;
  }

  /**
   * 下載 Blob
   */
  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 生成預覽（低分辨率）
   */
  generatePreview(scale = 0.5) {
    if (!this.map || !this.map.loaded()) {
      return null;
    }
    
    const mapCanvas = this.map.getCanvas();
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = Math.floor(mapCanvas.width * scale);
    previewCanvas.height = Math.floor(mapCanvas.height * scale);
    const ctx = previewCanvas.getContext('2d');
    
    ctx.drawImage(
      mapCanvas,
      0, 0, mapCanvas.width, mapCanvas.height,
      0, 0, previewCanvas.width, previewCanvas.height
    );
    
    return previewCanvas.toDataURL('image/jpeg', 0.7);
  }

  /**
   * 計算導出尺寸預覽
   */
  calculateDimensions(paperSize, orientation, dpi) {
    if (paperSize === 'custom') {
      const mapCanvas = this.map.getCanvas();
      const width = mapCanvas.clientWidth || mapCanvas.width;
      const height = mapCanvas.clientHeight || mapCanvas.height;
      const sizeMB = ((width * height * 4) / (1024 * 1024)).toFixed(1);
      return { width, height, sizeMB };
    }
    
    const size = PAPER_SIZES[paperSize];
    if (!size) {
      return { width: 0, height: 0, sizeMB: '0.0' };
    }
    
    let width = mmToPixels(size.width, dpi);
    let height = mmToPixels(size.height, dpi);
    
    if (orientation === 'landscape') {
      [width, height] = [height, width];
    }
    
    const sizeMB = ((width * height * 4) / (1024 * 1024)).toFixed(1);
    return { width, height, sizeMB };
  }
}

// 導出
if (typeof window !== 'undefined') {
  window.ExportManager = ExportManager;
  window.PAPER_SIZES = PAPER_SIZES;
  window.mmToPixels = mmToPixels;
  window.calculateScaleBar = calculateScaleBar;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportManager;
}




