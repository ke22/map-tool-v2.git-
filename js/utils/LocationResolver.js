/**
 * Location Resolver - 位置解析器
 * 
 * 使用 Mapbox Geocoding API 將地名解析為座標
 * 包含中文地名映射表和智能匹配邏輯
 */

/**
 * 中文地名的特殊映射表（用於糾正常見的地名解析錯誤）
 */
const LOCATION_NAME_MAPPINGS = {
  '白宮': 'White House, Washington DC, USA',
  '白宫': 'White House, Washington DC, USA',
  '華盛頓': 'Washington DC, USA',
  '华盛顿': 'Washington DC, USA',
  '華盛頓特區': 'Washington DC, USA',
  '华盛顿特区': 'Washington DC, USA',
  '紐約': 'New York, USA',
  '纽约': 'New York, USA',
  '洛杉磯': 'Los Angeles, USA',
  '洛杉矶': 'Los Angeles, USA',
  '舊金山': 'San Francisco, USA',
  '旧金山': 'San Francisco, USA',
  '倫敦': 'London, UK',
  '伦敦': 'London, UK',
  '巴黎': 'Paris, France',
  '東京': 'Tokyo, Japan',
  '东京': 'Tokyo, Japan',
  '北京': 'Beijing, China',
  '上海': 'Shanghai, China',
  '廣州': 'Guangzhou, China',
  '广州': 'Guangzhou, China',
  '深圳': 'Shenzhen, China',
  '香港': 'Hong Kong',
  '澳門': 'Macau',
  '澳门': 'Macau',
  '台北': 'Taipei, Taiwan',
  '臺北': 'Taipei, Taiwan',
  '高雄': 'Kaohsiung, Taiwan',
  '臺中': 'Taichung, Taiwan',
  '台中': 'Taichung, Taiwan'
};

/**
 * Location Resolver 類
 */
class LocationResolver {
  constructor(config = {}) {
    this.config = config;
    this.eventBus = config.eventBus || null;
    this.logger = config.logger || null;
  }

  /**
   * 檢查輸入是否看起來像座標
   * @param {string} input - 輸入字符串
   * @returns {boolean} 是否像座標
   */
  looksLikeCoordinates(input) {
    // 匹配經緯度格式：lat,lng 或 lng,lat
    const coordPattern = /^-?\d+\.?\d*\s*[,，]\s*-?\d+\.?\d*$/;
    return coordPattern.test(input.trim());
  }

  /**
   * 解析座標字符串
   * @param {string} coordString - 座標字符串（格式：lat,lng 或 lng,lat）
   * @returns {Array|null} [lng, lat] 或 null
   */
  parseCoordinates(coordString) {
    const cleaned = coordString.trim().replace(/[，]/g, ',');
    const parts = cleaned.split(',').map(s => parseFloat(s.trim()));
    
    if (parts.length !== 2 || parts.some(isNaN)) {
      return null;
    }

    const [first, second] = parts;
    
    // 判斷是 lat,lng 還是 lng,lat
    // 如果第一個數在 [-180, 180] 範圍內，第二個在 [-90, 90] 範圍內，可能是 lng,lat
    // 否則假設是 lat,lng
    if (Math.abs(first) <= 180 && Math.abs(second) <= 90) {
      // 可能是 lng,lat，但也要檢查是否可能是 lat,lng
      if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
        // 兩個都符合，優先假設是 lat,lng（更常見）
        return [second, first];
      }
      return [first, second];
    } else if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
      // 明顯是 lat,lng
      return [second, first];
    }

    // 默認假設是 lat,lng
    return [second, first];
  }

  /**
   * 使用 Mapbox Geocoding API 解析地名為座標
   * @param {string} locationName - 地名
   * @param {string} countryCode - 可選的國家代碼，用於改善結果
   * @returns {Promise<Array|null>} [lng, lat] 座標或 null
   */
  async resolveCoordinates(locationName, countryCode = null) {
    const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
    
    if (!CONFIG.MAPBOX || !CONFIG.MAPBOX.TOKEN) {
      if (this.logger) {
        this.logger.warn('Mapbox token not configured');
      }
      return null;
    }

    const token = CONFIG.MAPBOX.TOKEN;
    const baseUrl = CONFIG.GEOCODING?.BASE_URL || 'https://api.mapbox.com/geocoding/v5/mapbox.places';
    const limit = CONFIG.GEOCODING?.LIMIT || 5;

    // 檢查是否有特殊映射
    const mappedName = LOCATION_NAME_MAPPINGS[locationName] || LOCATION_NAME_MAPPINGS[locationName.trim()];
    
    // 構建查詢
    let query = mappedName || locationName;
    if (countryCode && !mappedName) {
      query = `${locationName}, ${countryCode}`;
    }

    const url = `${baseUrl}/${encodeURIComponent(query)}.json?access_token=${token}&limit=${limit}`;

    try {
      if (this.logger) {
        this.logger.info(`Resolving coordinates for: ${locationName}${mappedName ? ` (mapped to: ${mappedName})` : ''}`);
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      const features = data.features || [];

      if (features.length === 0) {
        if (this.logger) {
          this.logger.warn(`No coordinates found for: ${locationName}`);
        }
        return null;
      }

      // 如果有多個結果，嘗試找到最相關的結果
      let bestFeature = features[0];
      if (mappedName && features.length > 1) {
        const exactMatch = features.find(f => 
          f.place_type && 
          (f.place_type.includes('place') || f.place_type.includes('poi'))
        );
        if (exactMatch) {
          bestFeature = exactMatch;
        }
      }

      const coords = bestFeature.center; // [lng, lat]
      
      if (this.eventBus) {
        this.eventBus.emit('location:resolved', { 
          locationName, 
          coordinates: coords,
          feature: bestFeature
        });
      }

      return coords;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error resolving coordinates for ${locationName}:`, error);
      }
      
      if (this.eventBus) {
        this.eventBus.emit('location:resolve:error', { locationName, error });
      }
      
      return null;
    }
  }

  /**
   * 解析位置（自動判斷是座標還是地名）
   * @param {string} input - 輸入（座標或地名）
   * @param {string} countryCode - 可選的國家代碼
   * @returns {Promise<Array|null>} [lng, lat] 座標或 null
   */
  async resolve(input, countryCode = null) {
    const trimmed = input.trim();
    
    // 檢查是否為座標
    if (this.looksLikeCoordinates(trimmed)) {
      const coords = this.parseCoordinates(trimmed);
      if (coords) {
        if (this.eventBus) {
          this.eventBus.emit('location:resolved', { 
            input: trimmed,
            coordinates: coords,
            type: 'coordinates'
          });
        }
        return coords;
      }
    }

    // 作為地名解析
    return this.resolveCoordinates(trimmed, countryCode);
  }

  /**
   * 批量解析位置
   * @param {string[]} locations - 位置名稱數組
   * @param {Object} options - 選項
   * @returns {Promise<Map>} location -> [lng, lat] 的 Map
   */
  async resolveBatch(locations, options = {}) {
    const results = new Map();
    const concurrency = options.concurrency || 3;
    
    // 分批處理
    for (let i = 0; i < locations.length; i += concurrency) {
      const batch = locations.slice(i, i + concurrency);
      const promises = batch.map(async (location) => {
        const coords = await this.resolve(location);
        if (coords) {
          results.set(location, coords);
        }
      });

      await Promise.all(promises);
    }

    return results;
  }
}

// 導出到全局
if (typeof window !== 'undefined') {
  window.LocationResolver = LocationResolver;
  window.LOCATION_NAME_MAPPINGS = LOCATION_NAME_MAPPINGS;
}

// 導出（Node.js 環境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LocationResolver, LOCATION_NAME_MAPPINGS };
}



