/**
 * PlaceNameTranslator - 地名翻譯管理器
 * 
 * 管理英文地名到繁體中文的翻譯對照表
 * 支持 CSV 和 GeoJSON 格式的對照表
 */

class PlaceNameTranslator {
  constructor() {
    this.translations = new Map(); // ISO code / English name -> Traditional Chinese name
    this.loaded = false;
    this.loading = false;
  }

  /**
   * 從 CSV 文件加載翻譯對照表
   * CSV 格式：ISO_CODE,ENGLISH_NAME,TRADITIONAL_CHINESE_NAME
   * @param {string} csvUrl - CSV 文件 URL
   */
  async loadFromCSV(csvUrl) {
    if (this.loading) {
      return;
    }

    this.loading = true;
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.statusText}`);
      }

      const csvText = await response.text();
      const lines = csvText.split('\n').filter(line => line.trim());
      
      // 跳過標題行（如果存在）
      const startIndex = lines[0].includes('ISO_CODE') || lines[0].includes('ENGLISH_NAME') ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 處理 CSV（支持引號內的逗號）
        const parts = this.parseCSVLine(line);
        if (parts.length >= 3) {
          const isoCode = parts[0].trim().toUpperCase();
          const englishName = parts[1].trim();
          const chineseName = parts[2].trim();

          if (isoCode && chineseName) {
            // 使用 ISO code 作為主鍵（轉為大寫）
            const isoKey = isoCode.toUpperCase().trim();
            this.translations.set(isoKey, chineseName);
            
            // 同時使用英文名稱作為備用鍵
            if (englishName) {
              const engKey = englishName.toUpperCase().trim();
              this.translations.set(engKey, chineseName);
            }
            
            // 如果 ISO code 是 2 位，也嘗試添加常見的變體
            if (isoKey.length === 2) {
              // 某些數據可能使用 2 位代碼，保持兼容性
            }
          }
        }
      }

      this.loaded = true;
      console.log(`Loaded ${this.translations.size} place name translations from CSV`);
    } catch (error) {
      console.error('Failed to load place name translations from CSV:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * 從 GeoJSON 文件加載翻譯對照表
   * GeoJSON Feature 應包含 properties: {ISO_A2, NAME_EN, NAME_ZH_TW} 或類似字段
   * @param {string} geojsonUrl - GeoJSON 文件 URL
   */
  async loadFromGeoJSON(geojsonUrl) {
    if (this.loading) {
      return;
    }

    this.loading = true;
    try {
      const response = await fetch(geojsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
      }

      const geojson = await response.json();
      if (!geojson.features || !Array.isArray(geojson.features)) {
        throw new Error('Invalid GeoJSON format: missing features array');
      }

      let count = 0;
      geojson.features.forEach(feature => {
        if (!feature.properties) return;

        // 嘗試多種可能的字段名稱
        const isoCode = feature.properties.ISO_A2 || 
                       feature.properties.ISO_A3 || 
                       feature.properties.ISO_CODE ||
                       feature.properties.ADM0_A3 ||
                       feature.properties.ISO;
        
        const englishName = feature.properties.NAME_EN || 
                           feature.properties.NAME || 
                           feature.properties.NAME_ENGLISH ||
                           feature.properties.NAME_LONG;
        
        const chineseName = feature.properties.NAME_ZH_TW || 
                           feature.properties.NAME_ZH_HANT ||
                           feature.properties.NAME_ZH ||
                           feature.properties.NAME_CHINESE;

        if (isoCode && chineseName) {
          this.translations.set(isoCode.toUpperCase(), chineseName);
          count++;
        }
        
        if (englishName && chineseName) {
          this.translations.set(englishName.toUpperCase(), chineseName);
        }
      });

      this.loaded = true;
      console.log(`Loaded ${count} place name translations from GeoJSON`);
    } catch (error) {
      console.error('Failed to load place name translations from GeoJSON:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * 解析 CSV 行（處理引號內的逗號）
   * @param {string} line - CSV 行
   * @returns {string[]} 解析後的字段數組
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  /**
   * 翻譯地名
   * @param {string} name - 英文地名或 ISO code
   * @returns {string|null} 繁體中文地名，如果找不到則返回 null
   */
  translate(name) {
    if (!name) return null;
    
    const key = name.toUpperCase().trim();
    return this.translations.get(key) || null;
  }

  /**
   * 批量翻譯
   * @param {string[]} names - 英文地名數組
   * @returns {Map<string, string>} 翻譯結果 Map
   */
  translateBatch(names) {
    const result = new Map();
    names.forEach(name => {
      const translation = this.translate(name);
      if (translation) {
        result.set(name, translation);
      }
    });
    return result;
  }

  /**
   * 檢查是否已加載
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * 獲取所有翻譯
   * @returns {Map<string, string>}
   */
  getAllTranslations() {
    return new Map(this.translations);
  }

  /**
   * 清空翻譯緩存
   */
  clear() {
    this.translations.clear();
    this.loaded = false;
  }
}

// 導出類
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlaceNameTranslator;
} else if (typeof window !== 'undefined') {
  window.PlaceNameTranslator = PlaceNameTranslator;
}

