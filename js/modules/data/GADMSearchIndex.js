/**
 * GADM Search Index - 统一的 GADM 搜索索引
 * 
 * 支持 Level 0 (国家) 和 Level 1 (行政区) 的统一搜索
 * 提供快速的多语言名称匹配
 */

class GADMSearchIndex {
  constructor() {
    this.level0Index = null; // 国家索引 { code: { code, names, searchKeys, _properties } }
    this.level1Index = null; // 行政区索引 { country: { gid: { gid, country, names, searchKeys, _properties } } }
    this.searchCache = new Map(); // 查询缓存
    this.loaded = { level0: false, level1: false };
    this.loading = { level0: false, level1: false };
  }

  /**
   * 加载 Level 0 索引（从 JSON 文件）
   * @param {string} jsonUrl - JSON 文件 URL
   */
  async loadLevel0(jsonUrl) {
    if (this.loading.level0) {
      return;
    }

    this.loading.level0 = true;
    try {
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to load Level 0 index: ${response.statusText}`);
      }

      this.level0Index = await response.json();
      this.loaded.level0 = true;
      this.searchCache.clear(); // 清除缓存
      
      if (console && console.log) {
        console.log(`[GADMSearchIndex] Loaded Level 0 index: ${Object.keys(this.level0Index).length} countries`);
      }
    } catch (error) {
      if (console && console.error) {
        console.error('[GADMSearchIndex] Failed to load Level 0 index:', error);
      }
      throw error;
    } finally {
      this.loading.level0 = false;
    }
  }

  /**
   * 加载 Level 1 索引（从 JSON 文件）
   * @param {string} jsonUrl - JSON 文件 URL
   */
  async loadLevel1(jsonUrl) {
    if (this.loading.level1) {
      return;
    }

    this.loading.level1 = true;
    try {
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to load Level 1 index: ${response.statusText}`);
      }

      this.level1Index = await response.json();
      this.loaded.level1 = true;
      this.searchCache.clear(); // 清除缓存
      
      if (console && console.log) {
        const countryCount = Object.keys(this.level1Index).length;
        console.log(`[GADMSearchIndex] Loaded Level 1 index: ${countryCount} countries`);
      }
    } catch (error) {
      if (console && console.error) {
        console.error('[GADMSearchIndex] Failed to load Level 1 index:', error);
      }
      throw error;
    } finally {
      this.loading.level1 = false;
    }
  }

  /**
   * 统一搜索接口
   * @param {string} query - 搜索查询
   * @param {number} level - 0 (国家) 或 1 (行政区)
   * @param {string} countryCode - 国家代码（level 1 时必需）
   * @returns {Array} 匹配结果列表 [{ code/gid, level, names, matchScore, matchedKey }]
   */
  search(query, level = 0, countryCode = null) {
    if (!query || typeof query !== 'string') {
      return [];
    }

    if (level === 0) {
      return this.searchLevel0(query);
    } else if (level === 1) {
      if (!countryCode) {
        return [];
      }
      return this.searchLevel1(query, countryCode);
    }
    
    return [];
  }

  /**
   * Level 0 搜索（国家）
   * @param {string} query - 搜索查询
   * @returns {Array} 匹配结果列表
   */
  searchLevel0(query) {
    if (!this.loaded.level0 || !this.level0Index) {
      return [];
    }

    // 检查缓存
    const cacheKey = `level0:${query.toUpperCase()}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const queryUpper = query.toUpperCase().trim();
    const queryClean = queryUpper.replace(/[市縣省州]/g, '');
    const results = [];

    Object.entries(this.level0Index).forEach(([code, country]) => {
      let matchScore = 0;
      let matchedKey = null;

      // 精确匹配
      if (country.searchKeys.includes(queryUpper)) {
        matchScore = 100;
        matchedKey = queryUpper;
      }
      // 包含匹配
      else if (country.searchKeys.some(key => 
        key.includes(queryUpper) || queryUpper.includes(key)
      )) {
        const matched = country.searchKeys.find(key => 
          key.includes(queryUpper) || queryUpper.includes(key)
        );
        matchScore = 80;
        matchedKey = matched;
      }
      // 清理后匹配
      else if (queryClean.length > 0) {
        const matched = country.searchKeys.find(key => {
          const keyClean = key.replace(/[市縣省州]/g, '');
          return keyClean.includes(queryClean) || queryClean.includes(keyClean);
        });
        
        if (matched) {
          matchScore = 60;
          matchedKey = matched;
        }
      }

      // 单词匹配（多词查询）
      if (matchScore === 0 && queryClean.split(/\s+/).length > 1) {
        const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2);
        const allSearchKeys = country.searchKeys.join(' ');
        const matchedWords = queryWords.filter(word => allSearchKeys.includes(word.toUpperCase()));
        
        if (matchedWords.length > 0) {
          matchScore = 40 + (matchedWords.length / queryWords.length) * 20;
          matchedKey = matchedWords.join(' ');
        }
      }

      if (matchScore > 0) {
        results.push({
          code: code,
          level: 0,
          names: country.names,
          matchScore: matchScore,
          matchedKey: matchedKey,
          _properties: country._properties
        });
      }
    });

    // 按分数排序
    results.sort((a, b) => b.matchScore - a.matchScore);

    // 缓存结果
    this.searchCache.set(cacheKey, results);

    return results;
  }

  /**
   * Level 1 搜索（行政区）
   * @param {string} query - 搜索查询
   * @param {string} countryCode - 国家代码
   * @returns {Array} 匹配结果列表
   */
  searchLevel1(query, countryCode) {
    if (!this.loaded.level1 || !this.level1Index || !countryCode) {
      return [];
    }

    // 检查缓存
    const cacheKey = `level1:${countryCode.toUpperCase()}:${query.toUpperCase()}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const country = String(countryCode).toUpperCase();
    const regions = this.level1Index[country];
    
    if (!regions) {
      return [];
    }

    const queryUpper = query.toUpperCase().trim();
    const queryClean = queryUpper.replace(/[市縣省州OBLASTREGIONSTATE]/g, '');
    const results = [];

    Object.entries(regions).forEach(([gid, region]) => {
      let matchScore = 0;
      let matchedKey = null;

      // 精确匹配
      if (region.searchKeys.includes(queryUpper)) {
        matchScore = 100;
        matchedKey = queryUpper;
      }
      // 包含匹配
      else if (region.searchKeys.some(key => 
        key.includes(queryUpper) || queryUpper.includes(key)
      )) {
        const matched = region.searchKeys.find(key => 
          key.includes(queryUpper) || queryUpper.includes(key)
        );
        matchScore = 80;
        matchedKey = matched;
      }
      // 清理后匹配
      else if (queryClean.length > 0) {
        const matched = region.searchKeys.find(key => {
          const keyClean = key.replace(/[市縣省州OBLASTREGIONSTATE]/g, '');
          return keyClean.includes(queryClean) || queryClean.includes(keyClean);
        });
        
        if (matched) {
          matchScore = 60;
          matchedKey = matched;
        }
      }

      // 单词匹配（多词查询）
      if (matchScore === 0 && queryClean.split(/\s+/).length > 1) {
        const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2);
        const allSearchKeys = region.searchKeys.join(' ');
        const matchedWords = queryWords.filter(word => allSearchKeys.includes(word.toUpperCase()));
        
        if (matchedWords.length > 0) {
          matchScore = 40 + (matchedWords.length / queryWords.length) * 20;
          matchedKey = matchedWords.join(' ');
        }
      }

      if (matchScore > 0) {
        results.push({
          gid: gid,
          country: country,
          level: 1,
          names: region.names,
          matchScore: matchScore,
          matchedKey: matchedKey,
          _properties: region._properties
        });
      }
    });

    // 按分数排序
    results.sort((a, b) => b.matchScore - a.matchScore);

    // 缓存结果
    this.searchCache.set(cacheKey, results);

    return results;
  }

  /**
   * 根據 GID 查找行政區
   * @param {string} gid - GADM GID（例如 "RUS.1_1"）
   * @returns {Object|null} 行政區信息
   */
  findByGID(gid) {
    if (!this.loaded.level1 || !this.level1Index || !gid) {
      return null;
    }

    const gidUpper = String(gid).toUpperCase();
    
    // 提取國家代碼
    const parts = gidUpper.split('.');
    if (parts.length < 2) {
      return null;
    }

    const countryCode = parts[0];
    const regions = this.level1Index[countryCode];

    if (!regions) {
      return null;
    }

    // 精確匹配
    if (regions[gidUpper]) {
      return regions[gidUpper];
    }

    // 模糊匹配（移除 _1 後綴等）
    const gidPrefix = gidUpper.split('_')[0];
    for (const [key, region] of Object.entries(regions)) {
      if (key.startsWith(gidPrefix) || gidPrefix.startsWith(key.split('_')[0])) {
        return region;
      }
    }

    return null;
  }

  /**
   * 獲取國家的所有行政區
   * @param {string} countryCode - 國家代碼
   * @returns {Array} 行政區列表
   */
  getRegionsByCountry(countryCode) {
    if (!this.loaded.level1 || !this.level1Index || !countryCode) {
      return [];
    }

    const country = String(countryCode).toUpperCase();
    const regions = this.level1Index[country];

    if (!regions) {
      return [];
    }

    return Object.values(regions);
  }

  /**
   * 檢查 Level 0 是否已加載
   * @returns {boolean}
   */
  isLevel0Loaded() {
    return this.loaded.level0;
  }

  /**
   * 檢查 Level 1 是否已加載
   * @returns {boolean}
   */
  isLevel1Loaded() {
    return this.loaded.level1;
  }

  /**
   * 檢查是否已加載（任意級別）
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded.level0 || this.loaded.level1;
  }

  /**
   * 清空緩存
   */
  clearCache() {
    this.searchCache.clear();
  }

  /**
   * 獲取統計信息
   * @returns {Object} 統計信息
   */
  getStats() {
    return {
      level0: {
        loaded: this.loaded.level0,
        count: this.level0Index ? Object.keys(this.level0Index).length : 0
      },
      level1: {
        loaded: this.loaded.level1,
        countryCount: this.level1Index ? Object.keys(this.level1Index).length : 0,
        regionCount: this.level1Index ? 
          Object.values(this.level1Index).reduce((sum, regions) => sum + Object.keys(regions).length, 0) : 0
      },
      cacheSize: this.searchCache.size
    };
  }
}

// 導出類
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GADMSearchIndex;
} else if (typeof window !== 'undefined') {
  window.GADMSearchIndex = GADMSearchIndex;
}
