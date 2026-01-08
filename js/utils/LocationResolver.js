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
  '台中': 'Taichung, Taiwan',
  // 添加俄罗斯城市
  '莫斯科': 'Moscow, Russia',
  '聖彼得堡': 'Saint Petersburg, Russia',
  '圣彼得堡': 'Saint Petersburg, Russia',
  '新西伯利亞': 'Novosibirsk, Russia',
  '新西伯利亚': 'Novosibirsk, Russia',
  '葉卡捷琳堡': 'Yekaterinburg, Russia',
  '叶卡捷琳堡': 'Yekaterinburg, Russia',
  '喀山': 'Kazan, Russia',
  '下諾夫哥羅德': 'Nizhny Novgorod, Russia',
  '下诺夫哥罗德': 'Nizhny Novgorod, Russia',
  '烏法': 'Ufa, Russia',
  '乌法': 'Ufa, Russia',
  '羅斯托夫': 'Rostov-on-Don, Russia',
  '罗斯托夫': 'Rostov-on-Don, Russia'
};

/**
 * 中文城市到坐标的预定义映射表（当 Mapbox API 返回错误时使用）
 * 格式：城市名称 -> [lng, lat]
 */
const CITY_COORDINATES_MAP = {
  '莫斯科': [37.6173, 55.7558],
  '聖彼得堡': [30.3159, 59.9343],
  '圣彼得堡': [30.3159, 59.9343],
  '華盛頓': [-77.0369, 38.9072],
  '华盛顿': [-77.0369, 38.9072],
  '華盛頓特區': [-77.0369, 38.9072],
  '华盛顿特区': [-77.0369, 38.9072],
  '紐約': [-74.0060, 40.7128],
  '纽约': [-74.0060, 40.7128],
  '洛杉磯': [-118.2437, 34.0522],
  '洛杉矶': [-118.2437, 34.0522],
  '舊金山': [-122.4194, 37.7749],
  '旧金山': [-122.4194, 37.7749],
  '倫敦': [-0.1278, 51.5074],
  '伦敦': [-0.1278, 51.5074],
  '巴黎': [2.3522, 48.8566],
  '東京': [139.6917, 35.6895],
  '东京': [139.6917, 35.6895],
  '北京': [116.4074, 39.9042],
  '上海': [121.4737, 31.2304],
  '廣州': [113.2644, 23.1291],
  '广州': [113.2644, 23.1291],
  '深圳': [114.0579, 22.5431],
  '香港': [114.1694, 22.3193],
  '澳門': [113.5439, 22.1987],
  '澳门': [113.5439, 22.1987],
  '台北': [121.5654, 25.0330],
  '臺北': [121.5654, 25.0330],
  '高雄': [120.3119, 22.6273],
  '臺中': [120.6736, 24.1477],
  '台中': [120.6736, 24.1477],
  '新西伯利亞': [82.9346, 55.0084],
  '新西伯利亚': [82.9346, 55.0084],
  '葉卡捷琳堡': [60.6122, 56.8431],
  '叶卡捷琳堡': [60.6122, 56.8431],
  '喀山': [49.1064, 55.8304],
  '下諾夫哥羅德': [44.0020, 56.2965],
  '下诺夫哥罗德': [44.0020, 56.2965],
  '烏法': [55.9678, 54.7348],
  '乌法': [55.9678, 54.7348],
  '羅斯托夫': [39.7139, 47.2357],
  '罗斯托夫': [39.7139, 47.2357]
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
    
    // 首先检查是否有预定义坐标
    const predefCoords = CITY_COORDINATES_MAP[locationName] || CITY_COORDINATES_MAP[locationName.trim()];
    
    if (!CONFIG.MAPBOX || !CONFIG.MAPBOX.TOKEN) {
      if (this.logger) {
        this.logger.warn('Mapbox token not configured');
      }
      // 如果 Mapbox token 不可用，使用预定义坐标
      if (predefCoords) {
        if (this.logger) {
          this.logger.info(`Using predefined coordinates for ${locationName}: ${predefCoords}`);
        }
        return predefCoords;
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
        // Fallback to predefined coordinates
        if (predefCoords) {
          if (this.logger) {
            this.logger.info(`Using predefined coordinates for ${locationName}: ${predefCoords}`);
          }
          return predefCoords;
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
      
      // 验证坐标是否合理：如果查询是已知城市，检查返回的坐标是否在合理范围内
      if (predefCoords) {
        const [predLng, predLat] = predefCoords;
        const [retLng, retLat] = coords;
        // 计算距离（粗略检查，如果距离超过500公里，可能返回错误）
        const distance = Math.sqrt(Math.pow(retLng - predLng, 2) + Math.pow(retLat - predLat, 2)) * 111; // 粗略转换为公里
        if (distance > 500) {
          if (this.logger) {
            this.logger.warn(`Geocoding result seems incorrect for ${locationName} (distance: ${distance.toFixed(0)}km), using predefined coordinates`);
          }
          if (this.eventBus) {
            this.eventBus.emit('location:resolved', { 
              locationName, 
              coordinates: predefCoords,
              feature: null,
              fallback: true
            });
          }
          return predefCoords;
        }
      }
      
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
      
      // Fallback to predefined coordinates
      if (predefCoords) {
        if (this.logger) {
          this.logger.info(`Using predefined coordinates for ${locationName} (error fallback): ${predefCoords}`);
        }
        if (this.eventBus) {
          this.eventBus.emit('location:resolved', { 
            locationName, 
            coordinates: predefCoords,
            feature: null,
            fallback: true,
            error: error.message
          });
        }
        return predefCoords;
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
  window.CITY_COORDINATES_MAP = CITY_COORDINATES_MAP; // 导出坐标映射
}

// 導出（Node.js 環境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LocationResolver, LOCATION_NAME_MAPPINGS, CITY_COORDINATES_MAP };
}




