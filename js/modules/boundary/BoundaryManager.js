/**
 * BoundaryManager - 边界管理器
 * 
 * 管理地图上的边界线显示和样式
 */

class BoundaryManager {
  constructor(map, eventBus = null, gadmLoader = null) {
    this.map = map;
    this.eventBus = eventBus;
    this.layers = new Map(); // stage -> layer IDs
    this.sources = new Map(); // stage -> source IDs
    this.geometryStore = typeof window !== 'undefined' ? window.geometryStore : null;
    this.gadmLoader = gadmLoader || (typeof window !== 'undefined' ? window.gadmLoader : null);
    
    // 图层 ID 前缀
    this.sourcePrefix = 'boundary-source-';
    this.fillLayerPrefix = 'boundary-fill-';
    this.lineLayerPrefix = 'boundary-line-';
  }

  /**
   * 添加区域到指定阶段
   * @param {string} stage - 阶段名称 ('country' 或 'administration')
   * @param {Object} area - 区域对象 {id, gadmId, color, opacity, ...}
   */
  async addArea(stage, area) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    console.log(`[BoundaryManager] Adding area to ${stage} stage:`, area);

    // 获取或创建数据源
    const sourceId = this.getSourceId(stage);
    if (!this.map.getSource(sourceId)) {
      console.log(`[BoundaryManager] Creating source: ${sourceId}`);
      this.createSource(stage);
    }

    // 加载几何数据（使用 GADM 数据）
    // 傳遞 stage 參數以確保使用正確的 GADM level
    const gadmId = area.gadmId || area.id;
    console.log(`[BoundaryManager] Loading geometry for GADM ID: ${gadmId}, stage: ${stage}`);
    
    const geometry = await this.loadGeometry(gadmId, stage);
    if (!geometry) {
      // 優雅地處理 GADM 數據不存在的情況
      const level = this.getGADMLevel(gadmId);
      const country = gadmId.split('.')[0];
      console.warn(`[BoundaryManager] GADM data not found for ${gadmId}. Please ensure GADM data files are available.`);
      console.warn(`[BoundaryManager] Expected file: ${this.gadmLoader ? this.gadmLoader.getFilePath(gadmId) : `data/gadm/${country}/${country}_${level}.geojson`}`);
      // 不拋出錯誤，讓應用繼續運行（區域已添加到狀態，只是無法顯示邊界）
      return;
    }
    
    console.log(`[BoundaryManager] Geometry loaded successfully:`, geometry.type, geometry.features ? `${geometry.features.length} features` : 'single geometry');

    // 添加到数据源
    console.log(`[BoundaryManager] Adding geometry to source: ${sourceId}`);
    this.addGeometryToSource(sourceId, area.id, geometry, area);

    // 创建或更新图层
    console.log(`[BoundaryManager] Updating layers for stage: ${stage}`);
    this.updateLayers(stage);
    
    // 確保 Mapbox 數據已同步 - 使用 requestAnimationFrame 確保在下一個渲染幀
    await new Promise(resolve => {
      // 先立即檢查，如果已經有數據則立即繼續
      if (this.hasAreas(stage)) {
        console.log(`[BoundaryManager] Data already available, proceeding immediately`);
        resolve();
      } else {
        // 等待 Mapbox 完成數據更新（通常在下一個渲染幀）
        console.log(`[BoundaryManager] Waiting for data sync...`);
        requestAnimationFrame(() => {
          // 雙重 requestAnimationFrame 確保數據已完全同步到 Mapbox 內部
          requestAnimationFrame(() => {
            const hasAreasAfterWait = this.hasAreas(stage);
            console.log(`[BoundaryManager] After wait: hasAreas=${hasAreasAfterWait}`);
            resolve();
          });
        });
      }
    });
    
    // 從狀態管理器獲取階段設置
    let boundaryVisible = true;
    let boundaryMode = 'fill';
    
    if (typeof window !== 'undefined' && window.stateManager) {
      const state = window.stateManager.getState();
      const stageData = state[stage + 'Stage'];
      if (stageData) {
        boundaryVisible = stageData.boundaryVisible !== false;
        boundaryMode = stageData.boundaryMode || 'fill';
      }
    }
    
    // 驗證數據已正確添加（用於調試）
    const finalHasAreas = this.hasAreas(stage);
    console.log(`[BoundaryManager] Before setting visibility: hasAreas=${finalHasAreas}, visible=${boundaryVisible}, mode=${boundaryMode}`);
    
    // 設置可見性和模式
    this.setVisibility(stage, boundaryVisible);
    this.setMode(stage, boundaryMode);
    
    // 驗證圖層是否成功創建
    const fillLayerId = this.getFillLayerId(stage);
    const lineLayerId = this.getLineLayerId(stage);
    if (this.map.getLayer(fillLayerId)) {
      const visibility = this.map.getLayoutProperty(fillLayerId, 'visibility');
      console.log(`[BoundaryManager] Fill layer ${fillLayerId} visibility: ${visibility}`);
    } else {
      console.warn(`[BoundaryManager] Fill layer ${fillLayerId} not found!`);
    }
    if (this.map.getLayer(lineLayerId)) {
      const visibility = this.map.getLayoutProperty(lineLayerId, 'visibility');
      console.log(`[BoundaryManager] Line layer ${lineLayerId} visibility: ${visibility}`);
    } else {
      console.warn(`[BoundaryManager] Line layer ${lineLayerId} not found!`);
    }

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('boundary:area:added', { stage, area });
    }
    
    console.log(`[BoundaryManager] Successfully added area ${area.name} (${area.id}) to ${stage} stage`);
  }

  /**
   * 从指定阶段移除区域
   * @param {string} stage - 阶段名称
   * @param {string} areaId - 区域 ID
   */
  removeArea(stage, areaId) {
    const sourceId = this.getSourceId(stage);
    const source = this.map.getSource(sourceId);
    
    if (!source || source.type !== 'geojson') {
      return;
    }

    const data = source._data;
    if (data && data.features) {
      // 移除所有相關的 features（包括 featureId 和 featureId-* 格式的）
      data.features = data.features.filter(f => {
        if (f.id === areaId) return false;
        if (typeof f.id === 'string' && f.id.startsWith(`${areaId}-`)) return false;
        return true;
      });
      source.setData(data);
      console.log(`[BoundaryManager] Removed area ${areaId} and all related features from ${stage} stage`);
    }

    // 移除區域後，自動更新可見性和模式（檢查是否還有區域）
    if (typeof window !== 'undefined' && window.stateManager) {
      const state = window.stateManager.getState();
      const stageData = state[stage + 'Stage'];
      if (stageData) {
        const boundaryVisible = stageData.boundaryVisible !== false;
        const boundaryMode = stageData.boundaryMode || 'fill';
        // 會自動檢查是否有區域
        this.setVisibility(stage, boundaryVisible);
        this.setMode(stage, boundaryMode);
      }
    }

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('boundary:area:removed', { stage, areaId });
    }
  }

  /**
   * 更新区域样式（單個區域）
   * @param {string} stage - 阶段名称
   * @param {string} areaId - 区域 ID
   * @param {Object} style - 样式对象 {color, opacity}
   */
  updateAreaStyle(stage, areaId, style) {
    const sourceId = this.getSourceId(stage);
    const source = this.map.getSource(sourceId);
    
    if (!source || source.type !== 'geojson') {
      return;
    }

    // 獲取當前數據
    const data = source._data || { type: 'FeatureCollection', features: [] };
    
    // 關鍵修復：更新所有相關的 features（包括 areaId 和 areaId-* 格式的）
    // 這確保同一區域的所有 features（例如多個島嶼）都使用相同的樣式
    let updatedCount = 0;
    data.features.forEach(feature => {
      if (feature.id === areaId || 
          (typeof feature.id === 'string' && feature.id.startsWith(`${areaId}-`))) {
        if (feature.properties) {
          if (style.color !== undefined) {
            feature.properties.color = style.color;
          }
          if (style.opacity !== undefined) {
            feature.properties.opacity = style.opacity;
          }
          updatedCount++;
        }
      }
    });
    
    if (updatedCount > 0) {
      // 更新數據源
      source.setData(data);
      console.log(`[BoundaryManager] Updated style for ${updatedCount} feature(s) of area ${areaId}`);
    } else {
      console.warn(`[BoundaryManager] No features found to update for area ${areaId}`);
    }

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('boundary:style:updated', { stage, areaId, style });
    }
  }

  /**
   * 檢查指定階段是否有區域數據（改進版本，確保數據同步）
   * @private
   * @param {string} stage - 階段名稱
   * @returns {boolean} 是否有區域
   */
  hasAreas(stage) {
    const sourceId = this.getSourceId(stage);
    const source = this.map.getSource(sourceId);
    
    if (!source || source.type !== 'geojson') {
      console.log(`[BoundaryManager] hasAreas(${stage}): source not found or wrong type`);
      return false;
    }
    
    // 嘗試多種方式獲取數據，確保能獲取到最新數據
    let data = null;
    
    // 方法 1: 使用 getData()（如果可用，可能是最新數據）
    try {
      if (typeof source.getData === 'function') {
        data = source.getData();
      }
    } catch (e) {
      // getData() 不可用，繼續嘗試其他方法
    }
    
    // 方法 2: 使用 _data（內部數據引用，通常是最新的）
    if (!data) {
      data = source._data;
    }
    
    // 方法 3: 嘗試從 _options 獲取（某些情況下數據在這裡）
    if (!data && source._options && source._options.data) {
      data = source._options.data;
    }
    
    if (!data) {
      console.log(`[BoundaryManager] hasAreas(${stage}): no data found in source`);
      return false;
    }
    
    // 確保數據是 FeatureCollection 格式
    if (data.type !== 'FeatureCollection') {
      console.log(`[BoundaryManager] hasAreas(${stage}): data is not FeatureCollection (type: ${data.type})`);
      return false;
    }
    
    const hasFeatures = data.features && data.features.length > 0;
    
    // 添加詳細日誌用於調試
    console.log(`[BoundaryManager] hasAreas(${stage}): ${hasFeatures} (${data.features?.length || 0} features)`);
    
    return hasFeatures;
  }

  /**
   * 设置边界可见性（智能判断：只有有区域时才显示）
   * @param {string} stage - 阶段名称
   * @param {boolean} visible - 是否可见
   */
  setVisibility(stage, visible) {
    const fillLayerId = this.getFillLayerId(stage);
    const lineLayerId = this.getLineLayerId(stage);
    
    // 檢查是否有實際的區域數據
    const hasAreas = this.hasAreas(stage);
    
    // 只有當 visible=true 且有區域數據時才顯示
    const shouldShow = visible && hasAreas;
    
    if (fillLayerId && this.map.getLayer(fillLayerId)) {
      this.map.setLayoutProperty(fillLayerId, 'visibility', shouldShow ? 'visible' : 'none');
    }

    if (lineLayerId && this.map.getLayer(lineLayerId)) {
      this.map.setLayoutProperty(lineLayerId, 'visibility', shouldShow ? 'visible' : 'none');
    }

    // 触发事件（傳遞實際的顯示狀態）
    if (this.eventBus) {
      this.eventBus.emit('boundary:visibility:changed', { stage, visible: shouldShow, hasAreas });
    }
  }

  /**
   * 设置边界模式（智能判断：只有有区域时才显示）
   * @param {string} stage - 阶段名称
   * @param {string} mode - 模式 ('fill' 或 'outline')
   */
  setMode(stage, mode) {
    const fillLayerId = this.getFillLayerId(stage);
    const lineLayerId = this.getLineLayerId(stage);
    
    // 檢查是否有實際的區域數據
    const hasAreas = this.hasAreas(stage);
    
    // 如果沒有區域，直接隱藏
    if (!hasAreas) {
      console.log(`[BoundaryManager] setMode(${stage}, ${mode}): No areas found, hiding layers`);
      if (fillLayerId && this.map.getLayer(fillLayerId)) {
        this.map.setLayoutProperty(fillLayerId, 'visibility', 'none');
      }
      if (lineLayerId && this.map.getLayer(lineLayerId)) {
        this.map.setLayoutProperty(lineLayerId, 'visibility', 'none');
      }
      return;
    }
    
    // 有區域時，根據模式設置
    console.log(`[BoundaryManager] setMode(${stage}, ${mode}): Areas found, showing layers`);

    // 有區域時，根據模式設置
    if (mode === 'fill') {
      if (fillLayerId && this.map.getLayer(fillLayerId)) {
        this.map.setLayoutProperty(fillLayerId, 'visibility', 'visible');
      }
      if (lineLayerId && this.map.getLayer(lineLayerId)) {
        this.map.setLayoutProperty(lineLayerId, 'visibility', 'visible');
      }
    } else if (mode === 'outline') {
      if (fillLayerId && this.map.getLayer(fillLayerId)) {
        this.map.setLayoutProperty(fillLayerId, 'visibility', 'none');
      }
      if (lineLayerId && this.map.getLayer(lineLayerId)) {
        this.map.setLayoutProperty(lineLayerId, 'visibility', 'visible');
      }
    }

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('boundary:mode:changed', { stage, mode });
    }
  }

  /**
   * 清空指定阶段的所有区域
   * @param {string} stage - 阶段名称
   */
  clearStage(stage) {
    const sourceId = this.getSourceId(stage);
    const source = this.map.getSource(sourceId);
    
    if (source && source.type === 'geojson') {
      source.setData({
        type: 'FeatureCollection',
        features: []
      });
    }

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('boundary:stage:cleared', { stage });
    }
  }

  /**
   * 获取数据源 ID
   * @private
   * @param {string} stage - 阶段名称
   * @returns {string} 数据源 ID
   */
  getSourceId(stage) {
    return `${this.sourcePrefix}${stage}`;
  }

  /**
   * 获取填充图层 ID
   * @private
   * @param {string} stage - 阶段名称
   * @returns {string} 图层 ID
   */
  getFillLayerId(stage) {
    return `${this.fillLayerPrefix}${stage}`;
  }

  /**
   * 获取线条图层 ID
   * @private
   * @param {string} stage - 阶段名称
   * @returns {string} 图层 ID
   */
  getLineLayerId(stage) {
    return `${this.lineLayerPrefix}${stage}`;
  }

  /**
   * 创建数据源
   * @private
   * @param {string} stage - 阶段名称
   */
  createSource(stage) {
    const sourceId = this.getSourceId(stage);
    
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    this.sources.set(stage, sourceId);
  }

  /**
   * 更新图层
   * @private
   * @param {string} stage - 阶段名称
   */
  updateLayers(stage) {
    const sourceId = this.getSourceId(stage);
    const fillLayerId = this.getFillLayerId(stage);
    const lineLayerId = this.getLineLayerId(stage);

    // 添加填充图层（使用數據驅動的樣式）
    if (!this.map.getLayer(fillLayerId)) {
      // 找到合適的圖層位置（在 water 圖層之後，但在 label 圖層之前）
      const beforeLayer = this.findLayerBeforeLabel();
      
      const layerConfig = {
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          // 修復 2: 在 fill 模式下過濾預覽邊界（_preview 為 true 時使用透明色）
          // 使用 to-boolean 和 coalesce 處理 null 值，避免 Mapbox 表達式錯誤
          'fill-color': [
            'case',
            ['to-boolean', ['coalesce', ['get', '_preview'], false]], // 將 null/undefined 轉換為 false
            'rgba(0,0,0,0)',      // 如果是預覽邊界，使用透明色（不顯示填充）
            ['coalesce', ['get', 'color'], '#3388ff'] // 否則使用正常顏色
          ],
          'fill-opacity': [
            'case',
            ['to-boolean', ['coalesce', ['get', '_preview'], false]], // 將 null/undefined 轉換為 false
            0,                    // 如果是預覽邊界，透明度為0（不顯示填充）
            ['coalesce', ['get', 'opacity'], 0.5] // 否則使用正常透明度
          ]
        }
      };
      
      // 修復 3: 確保圖層順序
      // 在 Mapbox GL JS 中，如果兩個圖層都使用相同的 beforeId（標籤圖層），後添加的圖層會位於上層
      // 由於 country 圖層總是在 administration 圖層之前添加，administration 會自然位於其上
      // 因此我們只需確保它們都在標籤圖層之前即可
      if (beforeLayer) {
        layerConfig.beforeId = beforeLayer;
      }
      
      this.map.addLayer(layerConfig);
      console.log(`[BoundaryManager] Added fill layer ${fillLayerId}${beforeLayer ? ` before ${beforeLayer}` : ''}`);
    }

    // 添加线条图层（使用數據驅動的樣式）
    if (!this.map.getLayer(lineLayerId)) {
      // 線條圖層應該在填充圖層之後
      this.map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#3388ff'], // 從 feature properties 獲取顏色，如果沒有則使用默認值
          'line-width': 2,
          'line-opacity': ['coalesce', ['get', 'opacity'], 0.8] // 從 feature properties 獲取透明度，如果沒有則使用默認值
        }
      }, fillLayerId); // 添加在填充圖層之後
      console.log(`[BoundaryManager] Added line layer ${lineLayerId} after ${fillLayerId}`);
    }

    this.layers.set(stage, [fillLayerId, lineLayerId]);
  }

  /**
   * 找到標籤圖層之前的位置（用於正確的圖層順序）
   * @private
   * @returns {string|null} 圖層 ID 或 null
   */
  findLayerBeforeLabel() {
    // 常見的標籤圖層 ID（Mapbox 默認樣式）
    const labelLayerIds = [
      'place-labels',
      'poi-labels',
      'road-labels',
      'waterway-labels',
      'natural-labels',
      'country-labels',
      'state-labels',
      'city-labels',
      'chinese-labels' // 我們自己的中文標籤圖層
    ];
    
    // 查找第一個存在的標籤圖層
    for (const layerId of labelLayerIds) {
      if (this.map.getLayer(layerId)) {
        return layerId;
      }
    }
    
    // 如果找不到標籤圖層，返回 null（會添加到最上層）
    return null;
  }

  /**
   * 加载几何数据（使用 GADM 数据）
   * @private
   * @param {string} gadmId - GADM ID（例如: "TWN" 或 "TWN.1.1"）
   * @param {string} stage - 阶段名称（用于确定 GADM level）
   * @returns {Promise<Object>} GeoJSON 几何数据
   */
  async loadGeometry(gadmId, stage = null) {
    // 根據階段自動確定 GADM level
    if (stage) {
      const expectedLevel = stage === 'country' ? 0 : (stage === 'administration' ? 1 : 0);
      const currentLevel = this.getGADMLevel(gadmId);
      
      // 暫時不支持 level 2
      if (currentLevel === 2) {
        console.warn(`[BoundaryManager] Level 2 (cities) is currently disabled`);
        return null;
      }
      
      // 如果當前 level 不匹配預期 level，調整 gadmId
      if (currentLevel !== expectedLevel) {
        const parts = gadmId.split('.');
        if (stage === 'country' && parts.length > 1) {
          // 國家階段應該只使用國家代碼（level 0）
          gadmId = parts[0];
        } else if (stage === 'administration' && parts.length === 1) {
          // 行政區階段需要至少 level 1，如果只有國家代碼，無法載入
          console.warn(`[BoundaryManager] Administration stage requires level 1 GADM ID, but got level 0: ${gadmId}`);
          return null;
        } else if (parts.length > 2) {
          // 如果超過 level 1，截斷到 level 1
          console.warn(`[BoundaryManager] Level 2+ not supported, truncating to level 1: ${gadmId} -> ${parts.slice(0, 2).join('.')}`);
          gadmId = parts.slice(0, 2).join('.');
        }
      }
    }
    // 检查缓存
    if (this.geometryStore && this.geometryStore.has(gadmId)) {
      return this.geometryStore.get(gadmId);
    }

    // 使用 GADM Loader 加载数据
    if (this.gadmLoader) {
      try {
        console.log(`[BoundaryManager] Calling GADMLoader.load(${gadmId})`);
        const geojson = await this.gadmLoader.load(gadmId);
        
        if (geojson) {
          console.log(`[BoundaryManager] GADM data loaded successfully:`, {
            type: geojson.type,
            featuresCount: geojson.features ? geojson.features.length : 'N/A'
          });
          
          // 直接返回完整的 GeoJSON（Feature 或 FeatureCollection）
          // 讓 addGeometryToSource 處理完整的 FeatureCollection
          // 這樣可以保留所有 features 的 properties，用於數據驅動樣式
          
          // 缓存结果（緩存完整的 GeoJSON，不只是 geometry）
          if (this.geometryStore) {
            this.geometryStore.set(gadmId, geojson);
          }
          
          return geojson; // 返回完整的 GeoJSON，而不是只返回 geometry
        } else {
          console.warn(`[BoundaryManager] GADMLoader.load() returned null/undefined for ${gadmId}`);
          return null;
        }
      } catch (error) {
        console.error(`[BoundaryManager] Failed to load GADM data for ${gadmId}:`, error);
        console.error(`[BoundaryManager] Error details:`, {
          message: error.message,
          stack: error.stack
        });
        return null;
      }
    } else {
      // 如果没有 GADM Loader，尝试直接使用 window.GADMLoader
      if (typeof window !== 'undefined' && window.GADMLoader) {
        try {
          const loader = new window.GADMLoader(this.geometryStore, this.eventBus);
          const geojson = await loader.load(gadmId);
          
          if (geojson) {
            // 提取几何数据（同上）
            let geometry;
            if (geojson.type === 'FeatureCollection' && geojson.features && geojson.features.length > 0) {
              geometry = geojson.features[0].geometry;
              if (geojson.features.length > 1) {
                const coordinates = geojson.features.map(f => {
                  if (f.geometry.type === 'Polygon') {
                    return f.geometry.coordinates;
                  } else if (f.geometry.type === 'MultiPolygon') {
                    return f.geometry.coordinates;
                  }
                  return [];
                }).flat();
                
                geometry = {
                  type: coordinates.length > 1 ? 'MultiPolygon' : 'Polygon',
                  coordinates: coordinates.length > 1 ? coordinates : coordinates[0]
                };
              }
            } else if (geojson.type === 'Feature') {
              geometry = geojson.geometry;
            } else if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
              geometry = geojson;
            }
            
            if (geometry && this.geometryStore) {
              this.geometryStore.set(gadmId, geometry);
            }
            
            return geometry || null;
          }
        } catch (error) {
          console.warn(`Failed to load GADM data using window.GADMLoader for ${gadmId}:`, error);
        }
      }
      
      console.warn(`GADM Loader not available for loading boundary: ${gadmId}`);
      return null;
    }
    
    return null;
  }

  /**
   * 获取 GADM 级别
   * @private
   * @param {string} gadmId - GADM ID
   * @returns {number} 级别 (0=国家, 1=admin1, 2=admin2, ...)
   */
  getGADMLevel(gadmId) {
    if (!gadmId) return 0;
    const parts = gadmId.split('.');
    return parts.length - 1; // "TWN" = 0, "TWN.1" = 1, "TWN.1.1" = 2
  }

  /**
   * 添加几何数据到数据源
   * @private
   * @param {string} sourceId - 数据源 ID
   * @param {string} featureId - 要素 ID
   * @param {Object} geojson - GeoJSON 数据（Feature, FeatureCollection, 或 Geometry）
   * @param {Object} area - 区域对象
   */
  addGeometryToSource(sourceId, featureId, geojson, area) {
    console.log(`[BoundaryManager] addGeometryToSource called:`, {
      sourceId,
      featureId,
      geojsonType: geojson?.type,
      featuresCount: geojson?.features?.length || (geojson?.type === 'Feature' ? 1 : 0),
      areaName: area?.name
    });
    
    const source = this.map.getSource(sourceId);
    if (!source) {
      console.error(`[BoundaryManager] Source not found: ${sourceId}`);
      return;
    }
    
    if (source.type !== 'geojson') {
      console.error(`[BoundaryManager] Source is not GeoJSON type: ${source.type}`);
      return;
    }

    const data = source._data || { type: 'FeatureCollection', features: [] };
    console.log(`[BoundaryManager] Current source data: ${data.features?.length || 0} features`);
    
    // 處理不同類型的 GeoJSON
    let featuresToAdd = [];
    
    if (geojson.type === 'FeatureCollection' && geojson.features) {
      // FeatureCollection: 保留所有 features，但更新 properties
      console.log(`[BoundaryManager] Processing FeatureCollection with ${geojson.features.length} features`);
      
      // 關鍵修復：確保所有 features 使用相同的顏色和屬性（來自 area 對象）
      // 這確保同一區域的所有 features（例如多個島嶼）使用相同的顏色
      featuresToAdd = geojson.features.map((f, index) => ({
        ...f,
        id: index === 0 ? featureId : `${featureId}-${index}`, // 第一個使用原始 ID，其他的添加索引
        properties: {
          ...f.properties, // 保留原始 properties（如 GID_0, NAME 等）
          gadmId: area.gadmId || area.id, // 使用 area 的 gadmId
          name: area.name, // 使用 area 的 name
          color: area.color || '#3388ff', // 使用 area 的 color（重要！）
          opacity: area.opacity !== undefined ? area.opacity : 0.5, // 使用 area 的 opacity
          _preview: false // 明確標記為非預覽邊界，避免 Mapbox 表達式錯誤
        }
      }));
      
      // 驗證：確保所有 features 都有正確的顏色屬性
      const colorSet = new Set(featuresToAdd.map(f => f.properties.color));
      if (colorSet.size > 1) {
        console.warn(`[BoundaryManager] ⚠️  Multiple colors detected in features for ${featureId}:`, Array.from(colorSet));
        // 強制統一顏色（使用 area.color 或第一個 feature 的顏色）
        const unifiedColor = area.color || featuresToAdd[0].properties.color || '#3388ff';
        featuresToAdd.forEach(f => {
          f.properties.color = unifiedColor;
        });
        console.log(`[BoundaryManager] ✅ Unified color to: ${unifiedColor}`);
      }
    } else if (geojson.type === 'Feature') {
      // Feature: 更新 properties
      console.log(`[BoundaryManager] Processing single Feature`);
      featuresToAdd = [{
        ...geojson,
        id: featureId,
        properties: {
          ...geojson.properties, // 保留原始 properties
          gadmId: area.gadmId,
          name: area.name,
          color: area.color || '#3388ff',
          opacity: area.opacity !== undefined ? area.opacity : 0.5,
          _preview: false // 明確標記為非預覽邊界，避免 Mapbox 表達式錯誤
        }
      }];
    } else if (geojson.type === 'Polygon' || geojson.type === 'MultiPolygon') {
      // Geometry: 創建新的 Feature
      console.log(`[BoundaryManager] Processing geometry: ${geojson.type}`);
      featuresToAdd = [{
        type: 'Feature',
        id: featureId,
        properties: {
          gadmId: area.gadmId,
          name: area.name,
          color: area.color || '#3388ff',
          opacity: area.opacity !== undefined ? area.opacity : 0.5,
          _preview: false // 明確標記為非預覽邊界，避免 Mapbox 表達式錯誤
        },
        geometry: geojson
      }];
    } else {
      console.error(`[BoundaryManager] Unknown GeoJSON type: ${geojson.type}`);
      return;
    }
    
    console.log(`[BoundaryManager] Prepared ${featuresToAdd.length} features to add`);

    // 移除舊的 features（如果有相同的 featureId）
    data.features = data.features.filter(f => {
      if (f.id === featureId) return false;
      if (typeof f.id === 'string' && f.id.startsWith(`${featureId}-`)) return false;
      return true;
    });

    // 添加新的 features
    data.features.push(...featuresToAdd);

    // 更新數據源
    console.log(`[BoundaryManager] Updating source with ${data.features.length} total features`);
    source.setData(data);
    console.log(`[BoundaryManager] Source data updated successfully`);
    console.log(`[BoundaryManager] Added ${featuresToAdd.length} feature(s) to source ${sourceId} for area ${area.name}`);
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.BoundaryManager = BoundaryManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BoundaryManager;
}

