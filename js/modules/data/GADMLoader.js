/**
 * GADMLoader - GADM 数据加载器
 * 
 * 加载和管理 GADM (Global Administrative Areas) 数据
 */

class GADMLoader {
  constructor(geometryStore = null, eventBus = null, config = {}) {
    this.geometryStore = geometryStore || (typeof window !== 'undefined' ? window.geometryStore : null);
    this.eventBus = eventBus;
    
    // 從配置讀取 baseUrl，優先順序：config 參數 > CONFIG.GADM.BASE_URL > 默認值
    const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
    const gadmConfig = CONFIG.GADM || {};
    this.baseUrl = config.baseUrl || gadmConfig.BASE_URL || 'data/gadm';
    
    // 數據結構類型
    this.dataStructure = config.dataStructure || gadmConfig.DATA_STRUCTURE || 'country-dirs';
    
    // 是否啟用數據可用性檢查
    this.checkDataExists = config.checkDataExists !== undefined 
      ? config.checkDataExists 
      : (gadmConfig.CHECK_DATA_EXISTS !== false);
    
    this.loading = new Set(); // 正在加载的 GADM ID
    this.cache = new Map(); // 请求缓存
  }

  /**
   * 加载单个区域数据
   * @param {string} gadmId - GADM ID (例如: "IDN.1.1")
   * @param {Object} options - 选项
   * @returns {Promise<Object>} GeoJSON 数据
   */
  async load(gadmId, options = {}) {
    // 检查是否已在 GeometryStore 中
    if (this.geometryStore && this.geometryStore.has(gadmId)) {
      return this.geometryStore.get(gadmId);
    }

    // 检查缓存
    if (this.cache.has(gadmId)) {
      return this.cache.get(gadmId);
    }

    // 检查是否正在加载
    if (this.loading.has(gadmId)) {
      // 等待加载完成
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.cache.has(gadmId)) {
            clearInterval(checkInterval);
            resolve(this.cache.get(gadmId));
          } else if (!this.loading.has(gadmId)) {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 100);
      });
    }

    this.loading.add(gadmId);

    try {
      console.log(`[GADMLoader] Loading GADM data for: ${gadmId}, dataStructure: ${this.dataStructure}`);
      
      // 如果是合併文件格式，優先使用服務器端 API（過濾後的數據）
      if (this.dataStructure === 'merged-files') {
        const parts = gadmId.split('.');
        const level = parts.length - 1;
        
        try {
          // 嘗試使用服務器端 API 獲取過濾後的數據
          const apiUrl = `/api/gadm?gadmId=${encodeURIComponent(gadmId)}&level=${level}`;
          console.log(`[GADMLoader] Fetching from API: ${apiUrl}`);
          
          // 添加超時處理（5分鐘，與服務器端超時時間一致，因為文件很大）
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 300000);
          
          let response;
          try {
            response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              console.error(`[GADMLoader] API request timeout for ${gadmId} after 5 minutes`);
              throw new Error(`API request timeout for ${gadmId} (server is processing very large file ~955MB, this may take several minutes)`);
            }
            throw fetchError;
          }
          
          console.log(`[GADMLoader] API response status: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            console.log(`[GADMLoader] API response OK, parsing JSON...`);
            let geojson = await response.json();
            
            // 如果服務器返回的是單個 Feature，轉換為 FeatureCollection
            if (geojson && geojson.type === 'Feature' && !geojson.features) {
              console.log(`[GADMLoader] Server returned single Feature, converting to FeatureCollection`);
              geojson = {
                type: 'FeatureCollection',
                features: [geojson]
              };
            }
            
            // 驗證 GeoJSON
            if (geojson && geojson.type) {
              const featuresCount = geojson.type === 'FeatureCollection' 
                ? (geojson.features ? geojson.features.length : 0)
                : (geojson.type === 'Feature' ? 1 : 'N/A');
              
              console.log(`[GADMLoader] GeoJSON parsed successfully:`, {
                type: geojson.type,
                featuresCount: featuresCount
              });
              
              // 確保返回的是 FeatureCollection（BoundaryManager 期望這個格式）
              if (geojson.type === 'Feature') {
                geojson = {
                  type: 'FeatureCollection',
                  features: [geojson]
                };
              }
              
              // 存儲到 GeometryStore
              if (this.geometryStore) {
                const metadata = {
                  loadedAt: new Date().toISOString(),
                  level: this.getLevel(gadmId),
                  filePath: apiUrl
                };
                this.geometryStore.set(gadmId, geojson, metadata);
              }
              
              // 添加到緩存
              this.cache.set(gadmId, geojson);
              
              // 觸發事件
              if (this.eventBus) {
                this.eventBus.emit('gadm:loaded', { gadmId, geojson });
              }
              
              return geojson;
            } else {
              console.warn(`[GADMLoader] Invalid GeoJSON format from API:`, geojson);
            }
          } else {
            // API 返回錯誤狀態碼
            const errorText = await response.text().catch(() => 'Unable to read error response');
            console.error(`[GADMLoader] API error for ${gadmId}:`, {
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });
            
            if (response.status === 404) {
              // API 返回 404，嘗試直接加載文件（備用方案）
              console.warn(`[GADMLoader] API returned 404 for ${gadmId}, falling back to direct file load`);
            } else {
              // 其他錯誤，嘗試直接加載文件（備用方案）
              console.warn(`[GADMLoader] API error for ${gadmId} (${response.status}), falling back to direct file load`);
            }
          }
        } catch (apiError) {
          // API 請求失敗，嘗試直接加載文件（備用方案）
          console.warn(`GADM API request failed for ${gadmId}, falling back to direct file load:`, apiError);
        }
      }
      
      // 備用方案：直接加載文件（對於小文件或 country-dirs 格式）
      const filePath = this.getFilePath(gadmId);
      
      // 加载 GeoJSON 文件
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load GADM data: ${gadmId} (${response.status})`);
      }

      let geojson = await response.json();

      // 验证 GeoJSON
      if (!geojson || !geojson.type) {
        throw new Error(`Invalid GeoJSON format for: ${gadmId}`);
      }

      // 如果是合併文件格式，需要從 FeatureCollection 中過濾出對應的區域
      if (this.dataStructure === 'merged-files' && geojson.type === 'FeatureCollection') {
        const parts = gadmId.split('.');
        const level = parts.length - 1;
        
        // 過濾特徵
        let filteredFeatures = geojson.features;
        
        if (level === 0) {
          // Level 0: 使用 GID_0 字段匹配國家代碼（例如 "TWN"）
          const countryCode = parts[0];
          filteredFeatures = geojson.features.filter(f => {
            const props = f.properties || {};
            const gid0 = props.GID_0 || props.ISO || props.ISO_A3 || props.ISO_A2 || '';
            // GID_0 格式通常是 "TWN"（3個字符的國家代碼），直接匹配
            return gid0 === countryCode || 
                   gid0 === countryCode.toUpperCase() || 
                   gid0 === countryCode.toLowerCase() ||
                   gid0.startsWith(countryCode) ||
                   gid0.startsWith(countryCode.toUpperCase()) ||
                   gid0.startsWith(countryCode.toLowerCase());
          });
        } else if (level === 1) {
          // Level 1: 使用 GID_0 和 GID_1 字段匹配
          const countryCode = parts[0];
          const admin1Code = parts[1];
          filteredFeatures = geojson.features.filter(f => {
            const props = f.properties || {};
            const gid0 = props.GID_0 || props.ISO || props.ISO_A3 || props.ISO_A2 || '';
            const gid1 = props.GID_1 || props.NAME_1 || '';
            const gid0Country = gid0 ? gid0.split('.')[0] : '';
            return (gid0Country === countryCode || gid0Country === countryCode.toUpperCase() || gid0Country === countryCode.toLowerCase() ||
                    gid0 === countryCode || gid0 === countryCode.toUpperCase() || gid0 === countryCode.toLowerCase() ||
                    gid0.startsWith(countryCode) || gid0.startsWith(countryCode.toUpperCase()) || gid0.startsWith(countryCode.toLowerCase())) &&
                   (gid1 === admin1Code || gid1 === admin1Code.toString() || 
                    (gid1 && gid1.includes(admin1Code)));
          });
        } else if (level === 2) {
          // Level 2: 使用 GID_0, GID_1, GID_2 字段匹配
          const countryCode = parts[0];
          const admin1Code = parts[1];
          const admin2Code = parts[2];
          filteredFeatures = geojson.features.filter(f => {
            const props = f.properties || {};
            const gid0 = props.GID_0 || props.ISO || props.ISO_A3 || props.ISO_A2 || '';
            const gid1 = props.GID_1 || props.NAME_1 || '';
            const gid2 = props.GID_2 || props.NAME_2 || '';
            const gid0Country = gid0 ? gid0.split('.')[0] : '';
            return (gid0Country === countryCode || gid0Country === countryCode.toUpperCase() || gid0Country === countryCode.toLowerCase() ||
                    gid0 === countryCode || gid0 === countryCode.toUpperCase() || gid0 === countryCode.toLowerCase() ||
                    gid0.startsWith(countryCode) || gid0.startsWith(countryCode.toUpperCase()) || gid0.startsWith(countryCode.toLowerCase())) &&
                   (gid1 === admin1Code || gid1 === admin1Code.toString() || (gid1 && gid1.includes(admin1Code))) &&
                   (gid2 === admin2Code || gid2 === admin2Code.toString() || (gid2 && gid2.includes(admin2Code)));
          });
        }
        
        if (filteredFeatures.length === 0) {
          throw new Error(`No matching features found for GADM ID: ${gadmId}`);
        }
        
        // 創建過濾後的 GeoJSON
        if (filteredFeatures.length === 1) {
          // 單個特徵，返回 Feature
          geojson = filteredFeatures[0];
        } else {
          // 多個特徵，返回 FeatureCollection
          geojson = {
            type: 'FeatureCollection',
            features: filteredFeatures
          };
        }
      }

      // 存储到 GeometryStore
      if (this.geometryStore) {
        const metadata = {
          loadedAt: new Date().toISOString(),
          level: this.getLevel(gadmId),
          filePath
        };
        this.geometryStore.set(gadmId, geojson, metadata);
      }

      // 添加到缓存
      this.cache.set(gadmId, geojson);

      // 触发事件
      if (this.eventBus) {
        this.eventBus.emit('gadm:loaded', { gadmId, geojson });
      }

      return geojson;
    } catch (error) {
      console.error(`Error loading GADM data for ${gadmId}:`, error);
      
      if (this.eventBus) {
        this.eventBus.emit('gadm:error', { gadmId, error });
      }
      
      throw error;
    } finally {
      this.loading.delete(gadmId);
    }
  }

  /**
   * 批量加载区域数据
   * @param {string[]} gadmIds - GADM ID 数组
   * @param {Object} options - 选项
   * @returns {Promise<Map>} gadmId -> GeoJSON 的 Map
   */
  async loadBatch(gadmIds, options = {}) {
    const results = new Map();
    
    // 并行加载（限制并发数）
    const concurrency = options.concurrency || 5;
    const batches = [];
    
    for (let i = 0; i < gadmIds.length; i += concurrency) {
      const batch = gadmIds.slice(i, i + concurrency);
      batches.push(batch);
    }

    for (const batch of batches) {
      const promises = batch.map(async (gadmId) => {
        try {
          const geojson = await this.load(gadmId, options);
          if (geojson) {
            results.set(gadmId, geojson);
          }
        } catch (error) {
          console.warn(`Failed to load ${gadmId}:`, error);
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  /**
   * 获取文件路径
   * @private
   * @param {string} gadmId - GADM ID
   * @returns {string} 文件路径
   */
  getFilePath(gadmId) {
    const parts = gadmId.split('.');
    const level = parts.length - 1;
    
    if (this.dataStructure === 'merged-files') {
      // 使用合併文件格式：gadm_level0.geojson, gadm_level1.geojson, gadm_level2.geojson
      return `${this.baseUrl}/gadm_level${level}.geojson`;
    } else {
      // 使用按國家分目錄的格式：countries/{COUNTRY}/{COUNTRY}_0.geojson
      const country = parts[0];
      
      // 构建文件名: {country}_{level_parts}.geojson
      // Level 0: TWN_0.geojson
      // Level 1: TWN_1.geojson (使用第一个 admin level)
      // Level 2: TWN_1_1.geojson (使用所有 admin levels)
      let filename;
      if (level === 0) {
        // 国家级别
        filename = `${country}_0.geojson`;
      } else {
        // 行政级别
        filename = `${country}_${parts.slice(1).join('_')}.geojson`;
      }
      
      // 构建路径: data/gadm/{country}/{filename} 或 countries/{country}/{filename}
      if (this.baseUrl.includes('countries')) {
        return `${this.baseUrl}/${country}/${filename}`;
      } else {
        return `${this.baseUrl}/${country}/${filename}`;
      }
    }
  }

  /**
   * 获取 GADM 级别
   * @private
   * @param {string} gadmId - GADM ID
   * @returns {number} 级别 (0=国家, 1=admin1, 2=admin2, ...)
   */
  getLevel(gadmId) {
    return gadmId.split('.').length - 1;
  }

  /**
   * 检查数据文件是否存在
   * @param {string} gadmId - GADM ID
   * @returns {Promise<boolean>} 数据文件是否存在
   */
  async checkDataExists(gadmId) {
    try {
      const filePath = this.getFilePath(gadmId);
      const response = await fetch(filePath, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 搜索 GADM 数据
   * @param {string} query - 搜索查询
   * @param {Object} options - 选项
   * @returns {Promise<Array>} 搜索结果
   */
  async search(query, options = {}) {
    // TODO: 实现搜索功能
    // 需要 GADM 索引文件或使用 GeoResolverAgent
    console.warn('GADMLoader.search() not yet implemented');
    return [];
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 设置基础 URL
   * @param {string} baseUrl - 基础 URL
   */
  setBaseUrl(baseUrl) {
    this.baseUrl = baseUrl;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.GADMLoader = GADMLoader;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GADMLoader;
}

