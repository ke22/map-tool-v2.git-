/**
 * Main Application Entry Point
 * 
 * 初始化应用，整合所有组件
 */

// 全局对象
let eventBus;
let logger;
let stateManager;
let stageManager;
let stageController;
let map;
let boundaryManager;
let markerManager;
let labelManager;
let gadmLoader;
let contentListManager;
let placeNameTranslator;
let chineseLabelManager;
let basemapSwitcher;
let gadmSearchIndex;

// 標註模式狀態
let markerAddMode = false;
let labelAddMode = false;
let mapClickHandler = null;

/**
 * 初始化应用
 */
async function initApp() {
  // 初始化核心组件
  eventBus = new EventBus();
  const LOG_LEVELS = typeof window !== 'undefined' ? window.LOG_LEVELS : Logger.LOG_LEVELS;
  logger = new Logger('App', { level: LOG_LEVELS ? LOG_LEVELS.INFO : 1 });
  logger.info('Application initializing...');

  // 初始化工作流狀態
  const initialState = WorkflowState.createInitialState();
  
  // 初始化狀態管理器
  stateManager = new StateManager(initialState, eventBus);
  
  // 初始化階段管理器
  stageManager = new StageManager(stateManager, eventBus);
  
  // 初始化階段控制器
  stageController = new StageController(stageManager, stateManager, eventBus);

  // 初始化地圖
  await initMap();

  // 初始化模組
  initModules();

  // 初始化 UI
  initUI();
  
  // 初始化內容列表管理器（在模組初始化後）
  setTimeout(() => {
    if (typeof window !== 'undefined' && window.ContentListManager) {
      contentListManager = new window.ContentListManager(stateManager, boundaryManager, eventBus, logger, markerManager, labelManager);
      window.contentListManager = contentListManager; // 用於調試
      window.stageController = stageController; // 用於 ContentListManager
    }
  }, 100);

  // 訂閱狀態更新
  stateManager.subscribe((state) => {
    updateUI(state);
  });

  // 初始化 UI 狀態（確保當前階段標示正確）
  const currentState = stateManager.getState();
  updateUI(currentState);

  // 載入預設標示國家區域（可選）
  // 可以在這裡添加預設的國家區域，例如：
  // setTimeout(() => {
  //   handleCountrySearch('台灣', null);
  // }, 1000);

  logger.info('Application initialized successfully');

  // 導出全局對象供調試和測試使用
  if (typeof window !== 'undefined') {
    window.map = map;
    window.stageManager = stageManager;
    window.stateManager = stateManager;
    window.eventBus = eventBus;
    window.stageController = stageController;
    window.boundaryManager = boundaryManager;
    window.markerManager = markerManager;
    window.labelManager = labelManager;
    window.contentListManager = contentListManager;
    window.placeNameTranslator = placeNameTranslator;
    window.chineseLabelManager = chineseLabelManager;
    
    // 調試工具：列出所有圖層
    window.listAllLayers = () => {
      if (!map || !map.loaded()) {
        console.log('Map not loaded');
        return;
      }
      const layers = map.getStyle().layers;
      console.log('=== All Map Layers ===');
      layers.forEach(layer => {
        const visibility = map.getLayoutProperty(layer.id, 'visibility') || 'visible';
        console.log(`${layer.id} (${layer.type}) - visibility: ${visibility}`);
      });
      console.log(`Total: ${layers.length} layers`);
    };
    
    // 調試工具：列出所有邊界相關圖層
    window.listBoundaryLayers = () => {
      if (!map || !map.loaded()) {
        console.log('Map not loaded');
        return;
      }
      const layers = map.getStyle().layers;
      const boundaryLayers = layers.filter(layer => 
        layer.id.toLowerCase().includes('boundary') || 
        layer.id.toLowerCase().includes('admin')
      );
      console.log('=== Boundary/Admin Layers ===');
      boundaryLayers.forEach(layer => {
        const visibility = map.getLayoutProperty(layer.id, 'visibility') || 'visible';
        console.log(`${layer.id} (${layer.type}) - visibility: ${visibility}`);
      });
      console.log(`Total: ${boundaryLayers.length} boundary/admin layers`);
    };
    
    // 檢查邊界圖層狀態（調試函數）
    window.checkBoundaryLayers = function(stage = 'country') {
      if (!map || !boundaryManager) {
        console.log('Map or BoundaryManager not available');
        return;
      }
      
      const fillLayerId = `boundary-fill-${stage}`;
      const lineLayerId = `boundary-line-${stage}`;
      const sourceId = `boundary-source-${stage}`;
      
      console.log('=== Boundary Layer Status ===');
      console.log(`Stage: ${stage}`);
      
      // 檢查源
      const source = map.getSource(sourceId);
      if (source) {
        let data = null;
        try {
          data = source.getData ? source.getData() : source._data;
        } catch (e) {
          data = source._data;
        }
        console.log(`Source: ${sourceId}`);
        console.log(`  Type: ${source.type}`);
        console.log(`  Data type: ${data?.type}`);
        console.log(`  Features count: ${data?.features?.length || 0}`);
        if (data?.features?.length > 0) {
          console.log(`  First feature:`, data.features[0]);
          console.log(`  First feature properties:`, data.features[0].properties);
        }
      } else {
        console.log(`Source ${sourceId}: NOT FOUND`);
      }
      
      // 檢查填充圖層
      const fillLayer = map.getLayer(fillLayerId);
      if (fillLayer) {
        const visibility = map.getLayoutProperty(fillLayerId, 'visibility');
        const fillColor = map.getPaintProperty(fillLayerId, 'fill-color');
        const fillOpacity = map.getPaintProperty(fillLayerId, 'fill-opacity');
        console.log(`Fill Layer: ${fillLayerId}`);
        console.log(`  Visibility: ${visibility}`);
        console.log(`  Fill color:`, fillColor);
        console.log(`  Fill opacity:`, fillOpacity);
      } else {
        console.log(`Fill Layer ${fillLayerId}: NOT FOUND`);
      }
      
      // 檢查線條圖層
      const lineLayer = map.getLayer(lineLayerId);
      if (lineLayer) {
        const visibility = map.getLayoutProperty(lineLayerId, 'visibility');
        const lineColor = map.getPaintProperty(lineLayerId, 'line-color');
        const lineOpacity = map.getPaintProperty(lineLayerId, 'line-opacity');
        console.log(`Line Layer: ${lineLayerId}`);
        console.log(`  Visibility: ${visibility}`);
        console.log(`  Line color:`, lineColor);
        console.log(`  Line opacity:`, lineOpacity);
      } else {
        console.log(`Line Layer ${lineLayerId}: NOT FOUND`);
      }
      
      // 檢查 hasAreas
      if (boundaryManager.hasAreas) {
        const hasAreas = boundaryManager.hasAreas(stage);
        console.log(`Has Areas: ${hasAreas}`);
      }
    };
  }
}

/**
 * 初始化地圖
 */
async function initMap() {
  const CONFIG = window.CONFIG || {};
  const mapboxToken = CONFIG.MAPBOX?.TOKEN || 'pk.eyJ1IjoiY25hZ3JhcGhpY2Rlc2lnbiIsImEiOiJjbHRxbXlnc28wODF6Mmltb2Rjb3g5a25kIn0.x73wo3gKurL6CivFUOjVeg';
  const mapStyle = CONFIG.MAPBOX?.STYLE || 'mapbox://styles/mapbox/light-v11';
  const mapCenter = CONFIG.MAP?.DEFAULT_CENTER || [121.5654, 25.0330];
  const mapZoom = CONFIG.MAP?.DEFAULT_ZOOM || 2;

  mapboxgl.accessToken = mapboxToken;
  
  map = new mapboxgl.Map({
    container: 'map',
    style: mapStyle,
    center: mapCenter,
    zoom: mapZoom,
    minZoom: CONFIG.MAP?.MIN_ZOOM || 0,
    maxZoom: CONFIG.MAP?.MAX_ZOOM || 22,
    projection: 'globe' // 啟用 Globe 投影（3D 地球視圖）
  });

  // 在地圖加載時
  map.on('load', () => {
    logger.info('Map loaded successfully');
    
    // 確保使用 Globe 投影
    if (map.getProjection && map.getProjection().name !== 'globe') {
      map.setProjection('globe');
    }
    
    // 隱藏 Mapbox 默認的英文標籤圖層和行政區邊界
    hideMapboxLabels();
    hideMapboxAdministrativeBoundaries();
    
    // 設置天空背景（立即嘗試）
    setGlobeSkyBackground();
    
    // 延遲設置，確保樣式完全加載
    setTimeout(() => {
      // 設置海洋顏色
      setOceanColor('#C1D3E2');
      
      // 再次設置天空背景（確保生效）
      setGlobeSkyBackground();
      
      // 再次隱藏 Mapbox 標籤和行政區邊界（確保生效）
      hideMapboxLabels();
      hideMapboxAdministrativeBoundaries();
    }, 500);
    
    if (eventBus) {
      eventBus.emit('map:loaded', { map });
    }
  });
  
  // 監聽樣式加載完成（確保所有圖層都已加載）
  // 在樣式加載時（切換底圖時）
  map.on('style.load', () => {
    // 延遲設置，確保圖層完全加載
    setTimeout(() => {
      // 先設置天空背景（確保黑色背景不被白色覆蓋）
      setGlobeSkyBackground();
      // 然後設置海洋顏色
      setOceanColor('#C1D3E2');
      // 最後隱藏 Mapbox 標籤和行政區邊界
      hideMapboxLabels();
      hideMapboxAdministrativeBoundaries();
    }, 500);
  });

  // 防抖函數（用於頻繁觸發的事件）
  let hideBoundariesTimeout = null;
  function debouncedHideMapboxBoundaries() {
    if (hideBoundariesTimeout) {
      clearTimeout(hideBoundariesTimeout);
    }
    hideBoundariesTimeout = setTimeout(() => {
      hideMapboxAdministrativeBoundaries();
    }, 150); // 150ms 防抖，減少頻繁調用
  }

  // 在縮放過程中（使用防抖，避免性能問題）
  map.on('zoom', () => {
    debouncedHideMapboxBoundaries();
  });

  // 在縮放結束時（確保最終狀態正確）
  map.on('zoomend', () => {
    setTimeout(() => {
      hideMapboxAdministrativeBoundaries();
    }, 300);
  });

  // 在移動結束時
  map.on('moveend', () => {
    setTimeout(() => {
      hideMapboxAdministrativeBoundaries();
    }, 300);
  });

  map.on('error', (e) => {
    logger.error('Map error:', e);
  });

  // 等待地圖加載完成
  return new Promise((resolve) => {
    if (map.loaded()) {
      resolve();
    } else {
      map.once('load', resolve);
    }
  });
}

/**
 * 設置海洋顏色
 * @param {string} color - 海洋顏色（hex）
 */
function setOceanColor(color) {
  if (!map || !map.loaded()) {
    return;
  }

  try {
    // 方法1: 設置 water layer 的顏色
    if (map.getLayer('water')) {
      map.setPaintProperty('water', 'fill-color', color);
      logger.info('Ocean color set via water layer');
      return;
    }

    // 方法2: 嘗試添加自定義 water layer（如果不存在）
    if (map.getSource('ocean')) {
      // 源已存在，只需更新圖層
      if (map.getLayer('ocean-fill')) {
        map.setPaintProperty('ocean-fill', 'fill-color', color);
      } else {
        map.addLayer({
          id: 'ocean-fill',
          type: 'fill',
          source: 'ocean',
          paint: {
            'fill-color': color
          }
        });
      }
    } else {
      // 創建 ocean 數據源和圖層（使用簡單的全球海洋覆蓋）
      // 注意：這是一個簡化版本，實際應用中可能需要更精確的海洋邊界數據
      map.addSource('ocean', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-180, -90],
              [180, -90],
              [180, 90],
              [-180, 90],
              [-180, -90]
            ]]
          }
        }
      });

      map.addLayer({
        id: 'ocean-fill',
        type: 'fill',
        source: 'ocean',
        paint: {
          'fill-color': color,
          'fill-opacity': 1
        }
      }, 'land'); // 放在 land layer 之後
      
      logger.info('Ocean color layer created');
    }
  } catch (error) {
    logger.warn('Failed to set ocean color:', error);
  }
}

/**
 * 隱藏 Mapbox 默認的英文標籤圖層
 */
function hideMapboxLabels() {
  if (!map || !map.loaded()) {
    return;
  }

  try {
    const layers = map.getStyle().layers;
    
    layers.forEach(layer => {
      // 隱藏所有 symbol 類型的圖層（標籤圖層）
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        try {
          // 設置圖層為不可見
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        } catch (error) {
          // 忽略無法設置的圖層
          logger.debug(`Cannot hide layer: ${layer.id}`, error);
        }
      }
    });
    
    logger.info('Mapbox default labels hidden');
  } catch (error) {
    logger.warn('Failed to hide Mapbox labels:', error);
  }
}

/**
 * 隱藏 Mapbox 默認的行政區邊界圖層
 */
function hideMapboxAdministrativeBoundaries() {
  if (!map || !map.loaded()) {
    return;
  }

  try {
    const layers = map.getStyle().layers;
    const hiddenLayers = [];
    
    // 動態獲取我們自己的圖層前綴（從 BoundaryManager）
    const ourLayerPrefixes = [];
    if (typeof window !== 'undefined' && window.boundaryManager) {
      // 從 BoundaryManager 獲取實際的前綴
      const stages = ['country', 'administration'];
      stages.forEach(stage => {
        const fillId = boundaryManager.getFillLayerId(stage);
        const lineId = boundaryManager.getLineLayerId(stage);
        if (fillId) ourLayerPrefixes.push(fillId);
        if (lineId) ourLayerPrefixes.push(lineId);
      });
    } else {
      // 如果 BoundaryManager 不可用，使用靜態列表作為後備
      ourLayerPrefixes.push(
        'boundary-fill-country',
        'boundary-line-country',
        'boundary-fill-administration',
        'boundary-line-administration'
      );
    }
    
    // Mapbox 默認圖層匹配模式（僅匹配 Mapbox 圖層）
    const mapboxBoundaryPatterns = [
      /^admin-\d/,                   // admin-0, admin-1 等（Mapbox 默認格式）
      /^admin-/,                     // admin- 開頭的所有圖層
      /^boundary-admin/,             // boundary-admin- 開頭
      /-admin-boundary/,             // 包含 -admin-boundary
      /^admin-boundary/,             // admin-boundary 開頭
      /^place-boundary/,             // place-boundary 開頭（某些樣式）
      /^country-boundary/,           // country-boundary 開頭（某些樣式）
      /^state-boundary/,             // state-boundary 開頭（某些樣式）
    ];
    
    layers.forEach(layer => {
      const layerId = layer.id.toLowerCase();
      
      // 排除我們自己的圖層（動態檢查）
      const isOurLayer = ourLayerPrefixes.some(prefix => 
        layerId.startsWith(prefix.toLowerCase())
      );
      
      if (isOurLayer) {
        // 跳過我們自己的圖層
        return;
      }
      
      // 檢查是否匹配 Mapbox 模式
      const matchesMapboxPattern = mapboxBoundaryPatterns.some(pattern => 
        pattern.test(layer.id)
      );
      
      // 額外檢查：包含 admin 關鍵字的 Mapbox 圖層
      // 但要排除我們的圖層（已經在上面排除了）
      const isMapboxAdminLayer = (layer.type === 'line' || layer.type === 'fill') && 
                                  (layerId.includes('admin')) &&
                                  !layerId.startsWith('boundary-fill-') &&  // 確保排除我們的
                                  !layerId.startsWith('boundary-line-');    // 確保排除我們的
      
      if (matchesMapboxPattern || isMapboxAdminLayer) {
        try {
          if (map.getLayer(layer.id)) {
            map.setLayoutProperty(layer.id, 'visibility', 'none');
            hiddenLayers.push(layer.id);
          }
        } catch (error) {
          try {
            if (layer.type === 'line') {
              map.setPaintProperty(layer.id, 'line-opacity', 0);
            } else if (layer.type === 'fill') {
              map.setPaintProperty(layer.id, 'fill-opacity', 0);
            }
            hiddenLayers.push(layer.id + ' (via opacity)');
          } catch (e) {
            logger.debug(`Cannot hide administrative boundary layer: ${layer.id}`, error);
          }
        }
      }
    });
    
    if (hiddenLayers.length > 0) {
      logger.info(`Mapbox administrative boundaries hidden: ${hiddenLayers.length} layers`);
      if (logger.isDebug && logger.isDebug()) {
        logger.debug(`Hidden layers: ${hiddenLayers.join(', ')}`);
      }
    } else {
      logger.debug('No Mapbox administrative boundary layers found to hide');
    }
  } catch (error) {
    logger.warn('Failed to hide Mapbox administrative boundaries:', error);
  }
}

/**
 * 設置 Mapbox 地圖標籤為中文（已棄用，改用中文標籤管理器）
 */
// 全局變量來跟踪語言控制是否已添加
let mapboxLanguageControlAdded = false;

function setMapboxChineseLabels() {
  if (!map) return;

  try {
    if (!map.loaded()) {
      return;
    }
    
    // 使用 Mapbox Language 插件來設置中文標籤
    // 檢查是否已加載 MapboxLanguage
    if (typeof MapboxLanguage !== 'undefined') {
      // 檢查是否已經添加了語言控制
      if (!mapboxLanguageControlAdded) {
        try {
          // 添加 Mapbox Language 控制，設置默認語言為繁體中文
          // 注意：v0.10.0 版本使用 'zh' 作為繁體中文的語言代碼
          const languageControl = new MapboxLanguage({
            defaultLanguage: 'zh'  // v0.10.0 使用 'zh' 表示中文
          });
          map.addControl(languageControl);
          mapboxLanguageControlAdded = true;
          logger.info('Mapbox Chinese labels configured using MapboxLanguage plugin (zh)');
          return;
        } catch (error) {
          logger.warn('Failed to add MapboxLanguage control:', error);
          // 繼續嘗試備用方案
        }
      } else {
        logger.debug('MapboxLanguage control already added');
        return;
      }
    }
    
    // 備用方案：手動設置標籤圖層的 text-field 屬性
    const layers = map.getStyle().layers;
    let updatedLayers = 0;
    
    layers.forEach(layer => {
      // 檢查是否是標籤圖層（symbol 類型）
      if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
        try {
          // 獲取當前的 text-field 表達式
          const currentTextField = map.getLayoutProperty(layer.id, 'text-field');
          
          // 如果已經是表達式數組，檢查是否已經設置了中文
          if (Array.isArray(currentTextField)) {
            // 檢查是否包含 name_zh 或 name_zh-Hant
            const fieldStr = JSON.stringify(currentTextField);
            if (fieldStr.includes('name_zh') || fieldStr.includes('name_zh-Hant')) {
              return; // 已經設置了中文，跳過
            }
          }
          
          // 設置中文標籤優先級：優先使用 name_zh-Hant，如果沒有則使用 name_zh，最後使用 name
          // Mapbox 表達式格式：['coalesce', ['get', 'name_zh-Hant'], ['get', 'name_zh'], ['get', 'name']]
          const chineseTextField = [
            'coalesce',
            ['get', 'name_zh-Hant'],
            ['get', 'name_zh'],
            ['get', 'name']
          ];
          
          map.setLayoutProperty(layer.id, 'text-field', chineseTextField);
          updatedLayers++;
        } catch (error) {
          // 忽略無法設置的圖層（可能是只讀圖層）
          logger.debug(`Cannot set language for layer: ${layer.id}`, error);
        }
      }
    });
    
    if (updatedLayers > 0) {
      logger.info(`Mapbox Chinese labels configured manually: updated ${updatedLayers} label layers`);
    } else {
      logger.info('Mapbox Chinese labels configured (via style URL parameter)');
    }
  } catch (error) {
    logger.warn('Failed to set Mapbox Chinese labels:', error);
  }
}

/**
 * 設置 Globe 天空背景（僅使用 Mapbox 預設樣式 + setFog）
 * 不再修改或覆蓋 Mapbox 的 background 圖層顏色
 */
function setGlobeSkyBackground() {
  if (!map) {
    return;
  }

  // 確保地圖已加載
  if (!map.loaded()) {
    map.once('load', setGlobeSkyBackground);
    return;
  }

  try {
    // 使用 setFog() 設置天空背景（Mapbox Globe 投影的官方方法）
    // 這只影響地球後面的太空區域，不改動底圖樣式
    map.setFog({
      'range': [0.8, 8],
      'color': 'rgba(10, 10, 10, 0)',      // 地平線顏色（透明）
      'horizon-blend': 0,
      'high-color': 'rgba(10, 10, 10, 0.7)', // 高海拔顏色（深灰）
      'space-color': 'rgba(10, 10, 10, 1)',  // 太空顏色（純深黑色 #0a0a0a）
      'star-intensity': 0.5                  // 星星效果強度（中等）
    });

    // 如果之前添加過自定義 sky-background 圖層，這裡可以選擇性移除
    if (map.getLayer('sky-background')) {
      map.removeLayer('sky-background');
    }

    if (logger) {
      logger.info('Globe sky background set successfully using setFog() (Mapbox default background preserved)');
    }
  } catch (error) {
    if (logger) {
      logger.warn('Globe sky background setup (setFog) failed:', error.message);
    }
    // 如果 setFog 失敗，不再嘗試修改 background 圖層，保持 Mapbox 預設樣式
  }
}

/**
 * 初始化模組
 */
function initModules() {
  // 初始化 GADM 載入器（需要在 BoundaryManager 之前初始化）
  gadmLoader = new GADMLoader(
    typeof window !== 'undefined' ? window.geometryStore : null,
    eventBus
  );
  
  // 初始化邊界管理器（傳入 GADM Loader）
  boundaryManager = new BoundaryManager(map, eventBus, gadmLoader);
  
  // 初始化標記管理器
  markerManager = new MarkerManager(map, eventBus);
  
  // 初始化標籤管理器
  labelManager = new LabelManager(map, eventBus);
  
  // 初始化 GADM 搜索索引
  if (typeof window !== 'undefined' && window.GADMSearchIndex) {
    gadmSearchIndex = new window.GADMSearchIndex();
    
    // 异步加载搜索索引（不阻塞主流程）
    Promise.all([
      gadmSearchIndex.loadLevel0('/data/gadm/search-index-level0.json').catch(error => {
        logger.warn('Failed to load Level 0 search index:', error);
      }),
      gadmSearchIndex.loadLevel1('/data/gadm/search-index-level1.json').catch(error => {
        logger.warn('Failed to load Level 1 search index:', error);
      })
    ]).then(() => {
      const stats = gadmSearchIndex.getStats();
      logger.info(`GADM search indices loaded - Level 0: ${stats.level0.count} countries, Level 1: ${stats.level1.regionCount} regions`);
    });
    
    // 导出到全局供调试使用
    if (typeof window !== 'undefined') {
      window.gadmSearchIndex = gadmSearchIndex;
    }
  }
  
  // 初始化地名翻譯器
  const CONFIG = window.CONFIG || {};
  const translationsUrl = CONFIG.PLACE_NAMES?.TRANSLATIONS_URL || 'data/place-names/translations.csv';
  const autoLoad = CONFIG.PLACE_NAMES?.AUTO_LOAD !== false;
  
  if (typeof window !== 'undefined' && window.PlaceNameTranslator) {
    placeNameTranslator = new window.PlaceNameTranslator();
    
    // 自動加載翻譯對照表
    if (autoLoad) {
      placeNameTranslator.loadFromCSV(translationsUrl).then(() => {
        logger.info('Place name translations loaded');
        
        // 初始化中文標籤管理器
        if (typeof window !== 'undefined' && window.ChineseLabelManager && map) {
          const enableChineseLabels = CONFIG.PLACE_NAMES?.NATURAL_EARTH?.ENABLE_CHINESE_LABELS !== false;
          
          if (enableChineseLabels) {
            chineseLabelManager = new window.ChineseLabelManager(map, placeNameTranslator, eventBus);
            
            // 在地圖加載完成後初始化中文標籤
            const initChineseLabels = () => {
              setTimeout(() => {
                if (chineseLabelManager && map && map.loaded()) {
                  chineseLabelManager.initialize().catch(error => {
                    logger.warn('Failed to initialize Chinese labels:', error);
                  });
                }
              }, 2000); // 延遲2秒確保地圖和翻譯數據完全加載
            };
            
            if (map.loaded()) {
              initChineseLabels();
            } else {
              map.once('load', initChineseLabels);
            }
            
            // 監聽樣式加載事件，重新初始化中文標籤
            map.on('style.load', () => {
              setTimeout(() => {
                if (chineseLabelManager && !chineseLabelManager.initialized) {
                  chineseLabelManager.initialize().catch(error => {
                    logger.warn('Failed to reinitialize Chinese labels after style load:', error);
                  });
                }
              }, 1500);
            });
          }
        }
      }).catch(error => {
        logger.warn('Failed to load place name translations:', error);
      });
    }
  }
  
  // 初始化底圖切換器
  if (typeof window !== 'undefined' && window.BasemapSwitcher) {
    basemapSwitcher = new window.BasemapSwitcher(map, eventBus);
  }
  
  // 初始化導出管理器
  exportManager = new ExportManager(map, eventBus, logger);

  logger.info('Modules initialized');
}

/**
 * 初始化 UI
 */
function initUI() {
  // 工作流指示器点击
  document.querySelectorAll('.workflow-stage').forEach(stageEl => {
    stageEl.addEventListener('click', (e) => {
      const targetStage = stageEl.dataset.stage;
      const currentStage = stageManager.getCurrentStage();
      
      if (!targetStage) return;
      
      // 如果點擊的是當前階段，不做任何操作
      if (targetStage === currentStage) {
        return;
      }
      
    try {
      // 判斷是前進還是回溯
      const stageOrder = ['country', 'administration', 'export'];
      const currentIndex = stageOrder.indexOf(currentStage);
      const targetIndex = stageOrder.indexOf(targetStage);
      
      if (targetIndex > currentIndex) {
        // 前進：使用 switchStage
        stageManager.switchStage(targetStage);
      } else if (targetIndex < currentIndex) {
        // 回溯：使用 navigateToStage（會自動檢查是否允許）
        try {
          stageManager.navigateToStage(targetStage);
        } catch (error) {
          logger.warn('Cannot navigate to previous stage:', error.message);
        }
      }
    } catch (error) {
      logger.warn('Cannot switch to stage:', error.message);
    }
    });
  });

  // 國家區域階段按鈕
  const countryNextBtn = document.getElementById('country-next-btn');
  if (countryNextBtn) {
    countryNextBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 防止觸發父元素的點擊事件
      try {
        stageManager.switchStage('administration');
        logger.info('Switched to administration stage');
      } catch (error) {
        logger.error('Failed to switch stage:', error);
        alert('無法切換階段: ' + error.message);
      }
    });
  }

  const countrySkipBtn = document.getElementById('country-skip-btn');
  if (countrySkipBtn) {
    countrySkipBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // 防止觸發父元素的點擊事件
      try {
        stageController.skipCurrentStage();
        logger.info('Skipped current stage');
      } catch (error) {
        logger.error('Failed to skip stage:', error);
        alert('無法跳過階段: ' + error.message);
      }
    });
  }

  // 國家區域階段搜尋按鈕
  const countrySearchBtn = document.getElementById('country-search-btn');
  const countrySearchInput = document.getElementById('country-search');
  if (countrySearchBtn && countrySearchInput) {
    countrySearchBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const query = countrySearchInput.value.trim();
      if (query) {
        logger.info('Country search:', query);
        try {
          await handleSearch(query, 'country');
        } catch (error) {
          logger.error('Search error:', error);
          alert('搜尋時發生錯誤: ' + (error.message || '請稍後再試'));
        }
      } else {
        alert('請輸入搜尋關鍵字');
      }
    });

    // 支援 Enter 鍵搜尋
    countrySearchInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = countrySearchInput.value.trim();
        if (query) {
          await handleSearch(query, 'country');
        }
      }
    });
  }

  // 國家區域階段 AI 測試按鈕
  const countryAiTestBtn = document.getElementById('country-ai-test-btn');
  if (countryAiTestBtn) {
    countryAiTestBtn.addEventListener('click', async () => {
      const textarea = document.getElementById('country-ai-text');
      if (!textarea) return;
      
      // 預設測試文本（亞塞拜然和亞美尼亞的新聞）
      const testNewsText = `（中央社亞塞拜然首都巴庫13日綜合外電報導）高加索地區鄰國亞塞拜然和亞美尼亞今天表示，他們為了解決彼此間數十年來衝突所進行的談判已經完成，雙方對於1份條約的內文已達成同意，就待簽署。法新社報導，包括俄羅斯、歐洲聯盟（EU）、美國和土耳其都在爭奪高加索地區（Caucasus）的影響力。若是亞塞拜然與亞美尼亞能夠達成協議讓關係正常化，將是區域情勢的一大突破。雙亞為了爭奪現於亞塞拜然境內的亞美尼亞人聚居地區納戈爾諾．卡拉巴赫（Nagorno-Karabakh，簡稱納卡區），曾分別在蘇聯時代末期及2020年進行過戰爭。亞塞拜然在2023年9月發動24小時閃電攻擊後，奪下整個納卡區。亞塞拜然與亞美尼亞先前曾數度表示，雙方達成結束彼此長期衝突的全面性和平協議指日可待。但兩國先前的談判都未能就任何協議草案達成共識。不過，亞塞拜然外交部長拜拉莫夫（Jeyhun Bayramov）今天對媒體記者表示：「針對（我方）與亞美尼亞的和平協議內文，相關談判程序已完成。...有關先前未達共識的2條款，亞美尼亞已接受亞塞拜然的提議。」亞美尼亞外交部隨後也發布聲明證實消息，表示「協議草案的談判已經完成」，「和平協議已準備好簽署」。透過 Google News追蹤中央社亞美尼亞總理帕辛揚（Nikol Pashinyan）對這起「重大事件」予以喝采。他並告訴媒體記者，亞美尼亞「已準備好對於和平協議的簽署地點和時間展開討論」。儘管如此，亞塞拜然單方面發表聲明而非與亞美尼亞發表聯合聲明，遭到葉里凡（Yerevan，亞美尼亞首都）批評，暗示彼此間仍存在緊張關係。（譯者：林沂鋒/核稿：張正芊）1140314`;
      
      // 自動填充測試文本
      textarea.value = testNewsText;
      
      // 自動滾動到輸入框並聚焦
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(0, 0); // 將游標移到開頭
      }, 100);
      
      // 顯示提示
      logger.info('已載入測試文本，開始分析...');
      
      // 延遲 500ms 后自動觸發分析
      setTimeout(async () => {
        const countryAiBtn = document.getElementById('country-ai-btn');
        if (countryAiBtn) {
          countryAiBtn.click();
        }
      }, 500);
    });
  }
  
  // 國家區域階段 AI 分析按鈕
  const countryAiBtn = document.getElementById('country-ai-btn');
  if (countryAiBtn) {
    countryAiBtn.addEventListener('click', async () => {
      const textarea = document.getElementById('country-ai-text');
      const text = textarea?.value;
      if (!text || !text.trim()) {
        alert('請輸入要分析的文字內容');
        return;
      }
      
      try {
        logger.info('Country AI analysis started:', text.substring(0, 50) + '...');
        countryAiBtn.disabled = true;
        countryAiBtn.textContent = '分析中...';
        
        // 使用 GeminiService 分析文字
        if (typeof window !== 'undefined' && window.GeminiService) {
          const geminiService = new window.GeminiService();
          
          // 構建提示詞（提取國家名稱）
          const prompt = `請從以下文字中提取所有提到的國家或地區名稱。只返回國家/地區名稱，每行一個，使用繁體中文或英文名稱：

${text}

請只返回國家/地區名稱列表，不要其他解釋。`;
          
          const response = await geminiService.analyzeText(prompt);
          
          // GeminiService.analyzeText 返回的格式：{ text: string, ... }
          const responseText = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          if (responseText) {
            // 解析返回的國家名稱
            const countries = responseText
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0 && !line.startsWith('*') && !line.startsWith('-'))
              .filter(line => line.length < 50); // 過濾掉過長的行（可能是解釋文字）
            
            logger.info('Extracted countries:', countries);
            
            if (countries.length > 0) {
              // 記錄 AI 分析前的國家數量
              const stateBefore = stateManager.getState();
              const countBefore = (stateBefore.countryStage?.areas || []).length;
              
              // 預先檢查數據可用性
              const countriesWithData = [];
              const countriesWithoutData = [];
              
              // 獲取國家代碼並檢查數據
              const CountryCodes = typeof window !== 'undefined' ? window.CountryCodes : null;
              const GADMLoader = typeof window !== 'undefined' ? window.GADMLoader : null;
              
              for (const countryName of countries) {
                try {
                  const trimmedName = countryName.trim();
                  if (!trimmedName) continue;
                  
                  // 獲取國家代碼（優先使用模糊搜索，提高匹配率）
                  let countryCode = null;
                  if (CountryCodes) {
                    // 優先使用增強的搜索功能（支持模糊匹配）
                    if (typeof CountryCodes.search === 'function') {
                      const results = CountryCodes.search(trimmedName);
                      countryCode = results.length > 0 ? results[0].code : null;
                    }
                    
                    // Fallback: 使用精確匹配
                    if (!countryCode) {
                      countryCode = CountryCodes.findByChineseName(trimmedName) || 
                                    CountryCodes.findByEnglishName(trimmedName);
                    }
                  }
                  
                  if (countryCode) {
                    // 使用 Mapbox 邊界數據，所有國家都可用，無需檢查文件
                    // Mapbox 提供全球國家邊界數據，無需本地文件
                    countriesWithData.push(trimmedName);
                  } else {
                    // 如果找不到國家代碼，記錄為無數據
                    countriesWithoutData.push(trimmedName);
                  }
                } catch (error) {
                  logger.warn(`Failed to check data for country: ${countryName}`, error);
                  countriesWithoutData.push(countryName.trim());
                }
              }
              
              // 處理有數據的國家
              for (const countryName of countriesWithData) {
                try {
                  await handleSearch(countryName, 'country');
                  // 添加延遲避免請求過快
                  await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                  logger.warn(`Failed to process country: ${countryName}`, error);
                }
              }
              
              // 統計實際添加到 state 的數量
              const stateAfter = stateManager.getState();
              const countAfter = (stateAfter.countryStage?.areas || []).length;
              const newlyAddedCount = countAfter - countBefore;
              
              // 構建結果消息
              let message = '';
              if (newlyAddedCount > 0) {
                message = `成功添加 ${newlyAddedCount} 個國家/地區`;
                if (countriesWithoutData.length > 0) {
                  message += `\n\n以下 ${countriesWithoutData.length} 個國家/地區無法識別或沒有數據，已跳過：\n${countriesWithoutData.slice(0, 5).join('、')}${countriesWithoutData.length > 5 ? '...' : ''}`;
                }
              } else {
                if (countriesWithoutData.length > 0) {
                  message = `未能添加任何國家/地區\n\n以下國家/地區無法識別或沒有數據：\n${countriesWithoutData.slice(0, 5).join('、')}${countriesWithoutData.length > 5 ? '...' : ''}`;
                } else {
                  message = '未能添加任何國家/地區（可能都已存在）';
                }
              }
              
              alert(message);
              if (newlyAddedCount > 0 && textarea) textarea.value = '';
            } else {
              alert('未能從文字中提取到國家/地區名稱');
            }
          } else {
            alert('AI 分析返回結果為空');
          }
        } else {
          alert('GeminiService 未初始化，請檢查配置');
          logger.error('GeminiService not available');
        }
      } catch (error) {
        logger.error('AI analysis error:', error);
        alert('AI 分析時發生錯誤: ' + (error.message || '請稍後再試'));
      } finally {
        if (countryAiBtn) {
          countryAiBtn.disabled = false;
          countryAiBtn.textContent = 'AI 分析';
        }
      }
    });
  }

  // 行政區階段按鈕
  const adminNextBtn = document.getElementById('administration-next-btn');
  if (adminNextBtn) {
    adminNextBtn.addEventListener('click', () => {
      stageManager.switchStage('export');
    });
  }

  const adminSkipBtn = document.getElementById('administration-skip-btn');
  if (adminSkipBtn) {
    adminSkipBtn.addEventListener('click', () => {
      stageController.skipCurrentStage();
    });
  }

  // 行政區階段搜尋按鈕
  const adminSearchBtn = document.getElementById('administration-search-btn');
  const adminSearchInput = document.getElementById('administration-search');
  if (adminSearchBtn && adminSearchInput) {
    adminSearchBtn.addEventListener('click', async () => {
      const query = adminSearchInput.value.trim();
      if (query) {
        logger.info('Administration search:', query);
        await handleSearch(query, 'administration');
      }
    });

    // 支援 Enter 鍵搜尋
    adminSearchInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = adminSearchInput.value.trim();
        if (query) {
          await handleSearch(query, 'administration');
        }
      }
    });
  }

  // 行政區階段 AI 測試按鈕
  const adminAiTestBtn = document.getElementById('administration-ai-test-btn');
  if (adminAiTestBtn) {
    adminAiTestBtn.addEventListener('click', () => {
      const textarea = document.getElementById('administration-ai-text');
      if (textarea) {
        textarea.value = '台北市、新北市、桃園市、台中市、台南市、高雄市等直轄市都是台灣重要的都會區。';
      }
    });
  }
  
  // 行政區階段 AI 分析按鈕
  const adminAiBtn = document.getElementById('administration-ai-btn');
  if (adminAiBtn) {
    adminAiBtn.addEventListener('click', async () => {
      const textarea = document.getElementById('administration-ai-text');
      const text = textarea?.value;
      if (!text || !text.trim()) {
        alert('請輸入要分析的文字內容');
        return;
      }
      
      try {
        logger.info('Administration AI analysis started:', text.substring(0, 50) + '...');
        adminAiBtn.disabled = true;
        adminAiBtn.textContent = '分析中...';
        
        // 使用 GeminiService 分析文字
        if (typeof window !== 'undefined' && window.GeminiService) {
          const geminiService = new window.GeminiService();
          
          // 構建提示詞（提取行政區名稱）
          const prompt = `請從以下文字中提取所有提到的行政區名稱（省、州、市、縣等）。只返回行政區名稱，每行一個，使用繁體中文或英文名稱：

${text}

請只返回行政區名稱列表，不要其他解釋。`;
          
          const response = await geminiService.analyzeText(prompt);
          
          // GeminiService.analyzeText 返回的格式：{ text: string, ... }
          const responseText = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          
          if (responseText) {
            // 解析返回的行政區名稱
            const regions = responseText
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0 && !line.startsWith('*') && !line.startsWith('-'))
              .filter(line => line.length < 50); // 過濾掉過長的行
            
            logger.info('Extracted regions:', regions);
            
            if (regions.length > 0) {
              // 逐個處理行政區
              let processedCount = 0;
              for (const regionName of regions) {
                try {
                  await handleSearch(regionName.trim(), 'administration');
                  processedCount++;
                  await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                  logger.warn(`Failed to process region: ${regionName}`, error);
                }
              }
              
              if (processedCount > 0) {
                alert(`成功添加 ${processedCount} 個行政區`);
                if (textarea) textarea.value = '';
              } else {
                alert('未能找到有效的行政區');
              }
            } else {
              alert('未能從文字中提取到行政區名稱');
            }
          } else {
            alert('AI 分析返回結果為空');
          }
        } else {
          alert('GeminiService 未初始化，請檢查配置');
          logger.error('GeminiService not available');
        }
      } catch (error) {
        logger.error('AI analysis error:', error);
        alert('AI 分析時發生錯誤: ' + (error.message || '請稍後再試'));
      } finally {
        if (adminAiBtn) {
          adminAiBtn.disabled = false;
          adminAiBtn.textContent = 'AI 分析';
        }
      }
    });
  }

  // 添加標記按鈕
  const addMarkerBtn = document.getElementById('add-marker-btn');
  if (addMarkerBtn) {
    addMarkerBtn.addEventListener('click', () => {
      if (!markerManager) {
        logger.warn('MarkerManager not initialized');
        return;
      }
      // 進入標記添加模式
      enterMarkerAddMode();
    });
  }
  
  // 添加文字按鈕
  const addLabelBtn = document.getElementById('add-label-btn');
  if (addLabelBtn) {
    addLabelBtn.addEventListener('click', () => {
      if (!labelManager) {
        logger.warn('LabelManager not initialized');
        return;
      }
      // 進入文字添加模式
      enterLabelAddMode();
    });
  }

  // 取消標註模式按鈕
  const cancelAnnotationModeBtn = document.getElementById('cancel-annotation-mode-btn');
  if (cancelAnnotationModeBtn) {
    cancelAnnotationModeBtn.addEventListener('click', () => {
      exitAnnotationMode();
    });
  }

  // 標記添加彈出框事件
  const confirmMarkerBtn = document.getElementById('confirm-marker-btn');
  const cancelMarkerBtn = document.getElementById('cancel-marker-btn');
  const markerSizeInput = document.getElementById('marker-size-input');
  const markerSizeDisplay = document.getElementById('marker-size-display');
  
  if (confirmMarkerBtn) {
    confirmMarkerBtn.addEventListener('click', () => {
      confirmAddMarker();
    });
  }
  
  if (cancelMarkerBtn) {
    cancelMarkerBtn.addEventListener('click', () => {
      cancelAddMarker();
    });
  }

  if (markerSizeInput && markerSizeDisplay) {
    markerSizeInput.addEventListener('input', (e) => {
      markerSizeDisplay.textContent = e.target.value + 'px';
    });
  }

  // 文字添加彈出框事件
  const confirmLabelBtn = document.getElementById('confirm-label-btn');
  const cancelLabelBtn = document.getElementById('cancel-label-btn');
  const labelSizeInput = document.getElementById('label-size-input');
  const labelSizeDisplay = document.getElementById('label-size-display');
  
  if (confirmLabelBtn) {
    confirmLabelBtn.addEventListener('click', () => {
      confirmAddLabel();
    });
  }
  
  if (cancelLabelBtn) {
    cancelLabelBtn.addEventListener('click', () => {
      cancelAddLabel();
    });
  }

  if (labelSizeInput && labelSizeDisplay) {
    labelSizeInput.addEventListener('input', (e) => {
      labelSizeDisplay.textContent = e.target.value + 'px';
    });
  }

  // 匯出按鈕（已在 setupExportDialog 中處理，這裡只需要調用 showExportDialog）
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      showExportDialog();
    });
  }

  // 復原/重做按鈕
  const undoBtn = document.getElementById('undo-btn');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      stateManager.undo();
    });
  }

  const redoBtn = document.getElementById('redo-btn');
  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      stateManager.redo();
    });
  }

  // 鍵盤快捷鍵
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        stateManager.undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        stateManager.redo();
      }
    }
  });

  // 訂閱階段切換事件
  if (eventBus) {
    eventBus.on('stage:switch', async (data) => {
      logger.info('Stage switched:', data);
      // 階段切換時更新內容列表（確保跨階段可見）
      if (contentListManager) {
        contentListManager.updateContentList();
      }
      
      // 當切換到 administration 階段時，自動載入並顯示行政區邊界
      if (data.to === 'administration') {
        const state = stateManager.getState();
        const countryAreas = state.countryStage?.areas || [];
        const boundaryVisible = state.administrationStage?.boundaryVisible !== false;
        
        logger.info(`[Stage Switch] Entering administration stage. Countries: ${countryAreas.length}, boundaryVisible: ${boundaryVisible}`);
        
        if (countryAreas.length > 0 && boundaryVisible && boundaryManager && map) {
          // 確保 administration source 已創建
          const adminSourceId = 'boundary-source-administration';
          if (!map.getSource(adminSourceId)) {
            boundaryManager.createSource('administration');
          }
          
          // 為每個選中的國家載入行政區邊界（預覽模式，只顯示邊界線）
          for (const country of countryAreas) {
            const countryCode = country.gadmId || country.id;
            try {
              logger.info(`[Stage Switch] Loading administrative boundaries for country: ${countryCode}`);
              
              // 獲取該國家的所有行政區
              const response = await fetch(`/api/gadm?gadmId=${encodeURIComponent(countryCode)}&level=1`);
              if (response.ok) {
                const geojson = await response.json();
                if (geojson && geojson.features && geojson.features.length > 0) {
                  // 添加到 administration stage 的 source，使用 preview- 前綴
                  const adminSource = map.getSource(adminSourceId);
                  if (adminSource && adminSource.type === 'geojson') {
                    const currentData = adminSource._data || { type: 'FeatureCollection', features: [] };
                    const existingFeatureIds = new Set((currentData.features || []).map(f => f.id));
                    
                    // 只添加不存在的 features（避免重複）
                    const newFeatures = geojson.features
                      .filter(f => {
                        const gid = f.properties?.GID_1 || f.id;
                        const previewId = `preview-${countryCode}-${gid}`;
                        return !existingFeatureIds.has(previewId) && !existingFeatureIds.has(gid);
                      })
                      .map((f, index) => {
                        const gid = f.properties?.GID_1 || f.id || `admin-${index}`;
                        return {
                          ...f,
                          id: `preview-${countryCode}-${gid}`, // 使用 preview- 前綴區分
                          properties: {
                            ...f.properties,
                            _preview: true, // 標記為預覽邊界
                            _countryCode: countryCode
                          }
                        };
                      });
                    
                    if (newFeatures.length > 0) {
                      const updatedFeatures = [...(currentData.features || []), ...newFeatures];
                      adminSource.setData({
                        type: 'FeatureCollection',
                        features: updatedFeatures
                      });
                      
                      logger.info(`[Stage Switch] Added ${newFeatures.length} preview administrative boundaries for ${countryCode}`);
                    }
                  }
                }
              }
            } catch (error) {
              logger.error(`[Stage Switch] Failed to load administrative boundaries for ${countryCode}:`, error);
            }
          }
          
          // 顯示邊界線（使用 outline 模式，只顯示邊框）
          if (boundaryManager) {
            // 使用 requestAnimationFrame 確保數據已同步
            requestAnimationFrame(() => {
              boundaryManager.setVisibility('administration', true);
              boundaryManager.setMode('administration', 'outline'); // 只顯示邊界線，不填充
              logger.info(`[Stage Switch] Administrative boundaries set to visible (outline mode)`);
            });
          }
        }
      }
    });
  }

  // 設置導出對話框
  setupExportDialog();
  
  // 設置邊界可見性控制
  setupBoundaryVisibilityControls();
  
  // 設置底圖切換按鈕
  setupBasemapSwitcher();
}

/**
 * 設置底圖切換功能
 */
function setupBasemapSwitcher() {
  const basemapButtons = document.querySelectorAll('.basemap-btn');
  
  basemapButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const style = btn.dataset.style;
      
      if (!basemapSwitcher) {
        logger.warn('Basemap switcher not initialized');
        return;
      }
      
      // 切換底圖
      basemapSwitcher.switchStyle(style);
      
      // 更新按鈕狀態
      basemapButtons.forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      
      logger.info(`Basemap switched to: ${style}`);
    });
  });
  
  // 監聽底圖切換事件，重新隱藏 Mapbox 標籤並重新初始化中文標籤
  // 在底圖切換事件時
  if (eventBus) {
    eventBus.on('basemap:switched', () => {
      // 延遲執行，確保樣式完全加載
      setTimeout(() => {
        hideMapboxLabels();
        hideMapboxAdministrativeBoundaries();
        
        // 重新初始化中文標籤（如果已啟用）
        if (chineseLabelManager) {
          // 移除舊的標籤層
          if (chineseLabelManager.initialized) {
            chineseLabelManager.remove();
          }
          
          // 重新初始化
          setTimeout(() => {
            if (chineseLabelManager && map && map.loaded()) {
              chineseLabelManager.initialize().catch(error => {
                logger.warn('Failed to reinitialize Chinese labels after basemap switch:', error);
              });
            }
          }, 1000);
        }
        
        // 重新設置天空背景（優先，確保黑色背景不被白色覆蓋）
        setGlobeSkyBackground();
        // 然後設置海洋顏色
        setOceanColor('#C1D3E2');
      }, 1000);
    });
  }
}

/**
 * 設置邊界可見性控制
 */
function setupBoundaryVisibilityControls() {
  // 國家邊界可見性控制
  const countryBoundaryVisible = document.getElementById('country-boundary-visible');
  const countryBoundaryMode = document.getElementById('country-boundary-mode');
  
  if (countryBoundaryVisible) {
    countryBoundaryVisible.addEventListener('change', (e) => {
      const visible = e.target.checked;
      if (stageController) {
        stageController.updateBoundarySettings('country', { boundaryVisible: visible });
      }
      if (boundaryManager) {
        boundaryManager.setVisibility('country', visible);
      }
    });
  }
  
  if (countryBoundaryMode) {
    countryBoundaryMode.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (stageController) {
        stageController.updateBoundarySettings('country', { boundaryMode: mode });
      }
      if (boundaryManager) {
        boundaryManager.setMode('country', mode);
      }
    });
  }
  
  // 行政區邊界可見性控制
  const administrationBoundaryVisible = document.getElementById('administration-boundary-visible');
  const administrationBoundaryMode = document.getElementById('administration-boundary-mode');
  
  if (administrationBoundaryVisible) {
    administrationBoundaryVisible.addEventListener('change', (e) => {
      const visible = e.target.checked;
      if (stageController) {
        stageController.updateBoundarySettings('administration', { boundaryVisible: visible });
      }
      if (boundaryManager) {
        boundaryManager.setVisibility('administration', visible);
      }
    });
  }
  
  if (administrationBoundaryMode) {
    administrationBoundaryMode.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (stageController) {
        stageController.updateBoundarySettings('administration', { boundaryMode: mode });
      }
      if (boundaryManager) {
        boundaryManager.setMode('administration', mode);
      }
    });
  }
  
  // 監聽狀態更新，同步 UI
  if (stateManager) {
    stateManager.subscribe((state) => {
      // 更新國家邊界控制
      if (countryBoundaryVisible) {
        countryBoundaryVisible.checked = state.countryStage?.boundaryVisible !== false;
      }
      if (countryBoundaryMode && state.countryStage?.boundaryMode) {
        countryBoundaryMode.value = state.countryStage.boundaryMode;
      }
      
      // 更新行政區邊界控制
      if (administrationBoundaryVisible) {
        administrationBoundaryVisible.checked = state.administrationStage?.boundaryVisible !== false;
      }
      if (administrationBoundaryMode && state.administrationStage?.boundaryMode) {
        administrationBoundaryMode.value = state.administrationStage.boundaryMode;
      }
    });
  }
  
  // 監聽邊界更新事件，同步地圖顯示
  if (eventBus) {
    eventBus.on('boundary:updated', ({ stage, settings }) => {
      if (boundaryManager) {
        if (settings.boundaryVisible !== undefined) {
          boundaryManager.setVisibility(stage, settings.boundaryVisible);
        }
        if (settings.boundaryMode) {
          boundaryManager.setMode(stage, settings.boundaryMode);
        }
      }
    });
  }
  
  // 我的地圖內容面板中的行政區邊界控制
  const contentListBoundaryCheckbox = document.getElementById('content-list-administration-boundary-visible');
  const contentListBoundaryText = contentListBoundaryCheckbox?.nextElementSibling;
  
  if (contentListBoundaryCheckbox) {
    // 初始化狀態
    const state = stateManager.getState();
    const isVisible = state.administrationStage?.boundaryVisible !== false;
    contentListBoundaryCheckbox.checked = isVisible;
    if (contentListBoundaryText) {
      contentListBoundaryText.textContent = isVisible ? '顯示行政區邊界' : '隱藏行政區邊界';
    }
    
    // 監聽 checkbox 變化
    contentListBoundaryCheckbox.addEventListener('change', (e) => {
      const visible = e.target.checked;
      
      // 更新狀態
      if (stageController) {
        stageController.updateBoundarySettings('administration', { boundaryVisible: visible });
      }
      
      // 更新地圖顯示
      if (boundaryManager) {
        boundaryManager.setVisibility('administration', visible);
      }
      
      // 更新 checkbox 文字
      if (contentListBoundaryText) {
        contentListBoundaryText.textContent = visible ? '顯示行政區邊界' : '隱藏行政區邊界';
      }
      
      logger.info(`Administration boundary visibility (from content list): ${visible ? 'visible' : 'hidden'}`);
    });
    
    // 監聽狀態更新，同步 checkbox 狀態（與現有的狀態監聽器一起工作）
    if (stateManager) {
      stateManager.subscribe((state) => {
        const isVisible = state.administrationStage?.boundaryVisible !== false;
        if (contentListBoundaryCheckbox.checked !== isVisible) {
          contentListBoundaryCheckbox.checked = isVisible;
          if (contentListBoundaryText) {
            contentListBoundaryText.textContent = isVisible ? '顯示行政區邊界' : '隱藏行政區邊界';
          }
        }
      });
    }
  }
}

// 待添加的標記/文字數據（臨時存儲）
let pendingMarkerData = null;
let pendingLabelData = null;

/**
 * 進入標記添加模式
 */
function enterMarkerAddMode() {
  // 退出其他模式
  exitAnnotationMode();
  
  markerAddMode = true;
  labelAddMode = false;
  
  // 更新 UI
  updateAnnotationModeUI();
  
  // 設置地圖游標
  if (map) {
    map.getCanvas().style.cursor = 'crosshair';
  }
  
  // 添加地圖點擊事件
  if (map && !mapClickHandler) {
    mapClickHandler = (e) => {
      if (markerAddMode) {
        handleMapClickForMarker(e);
      } else if (labelAddMode) {
        handleMapClickForLabel(e);
      }
    };
    map.on('click', mapClickHandler);
  }
  
  logger.info('Entered marker add mode - Click on map to add marker');
}

/**
 * 進入文字添加模式
 */
function enterLabelAddMode() {
  // 退出其他模式
  exitAnnotationMode();
  
  markerAddMode = false;
  labelAddMode = true;
  
  // 更新 UI
  updateAnnotationModeUI();
  
  // 設置地圖游標
  if (map) {
    map.getCanvas().style.cursor = 'crosshair';
  }
  
  // 添加地圖點擊事件
  if (map && !mapClickHandler) {
    mapClickHandler = (e) => {
      if (markerAddMode) {
        handleMapClickForMarker(e);
      } else if (labelAddMode) {
        handleMapClickForLabel(e);
      }
    };
    map.on('click', mapClickHandler);
  }
  
  logger.info('Entered label add mode - Click on map to add label');
}

/**
 * 退出標註模式
 */
function exitAnnotationMode() {
  markerAddMode = false;
  labelAddMode = false;
  
  // 恢復地圖游標
  if (map) {
    map.getCanvas().style.cursor = '';
  }
  
  // 移除地圖點擊事件
  if (map && mapClickHandler) {
    map.off('click', mapClickHandler);
    mapClickHandler = null;
  }
  
  // 更新 UI
  updateAnnotationModeUI();
  
  // 關閉彈出框
  const markerPopup = document.getElementById('marker-add-popup');
  const labelPopup = document.getElementById('label-add-popup');
  if (markerPopup) markerPopup.style.display = 'none';
  if (labelPopup) labelPopup.style.display = 'none';
  
  pendingMarkerData = null;
  pendingLabelData = null;
  
  logger.info('Exited annotation mode');
}

/**
 * 更新標註模式 UI
 */
function updateAnnotationModeUI() {
  const indicator = document.getElementById('annotation-mode-indicator');
  const modeText = document.getElementById('annotation-mode-text');
  const addMarkerBtn = document.getElementById('add-marker-btn');
  const addLabelBtn = document.getElementById('add-label-btn');
  
  if (markerAddMode) {
    if (indicator) indicator.style.display = 'block';
    if (modeText) modeText.textContent = '標記模式：點擊地圖添加標記';
    if (addMarkerBtn) addMarkerBtn.classList.add('active');
    if (addLabelBtn) addLabelBtn.classList.remove('active');
  } else if (labelAddMode) {
    if (indicator) indicator.style.display = 'block';
    if (modeText) modeText.textContent = '文字模式：點擊地圖添加文字';
    if (addMarkerBtn) addMarkerBtn.classList.remove('active');
    if (addLabelBtn) addLabelBtn.classList.add('active');
  } else {
    if (indicator) indicator.style.display = 'none';
    if (addMarkerBtn) addMarkerBtn.classList.remove('active');
    if (addLabelBtn) addLabelBtn.classList.remove('active');
  }
}

/**
 * 處理地圖點擊（標記模式）
 */
function handleMapClickForMarker(e) {
  if (!markerAddMode || !map) return;
  
  const coordinates = [e.lngLat.lng, e.lngLat.lat];
  
  // 存儲待添加的標記數據
  pendingMarkerData = {
    coordinates: coordinates,
    lngLat: e.lngLat
  };
  
  // 顯示標記添加彈出框
  const popup = document.getElementById('marker-add-popup');
  if (popup) {
    // 重置表單
    const nameInput = document.getElementById('marker-name-input');
    const colorInput = document.getElementById('marker-color-input');
    const typeInput = document.getElementById('marker-type-input');
    const sizeInput = document.getElementById('marker-size-input');
    
    if (nameInput) nameInput.value = `標記 ${Date.now()}`;
    if (colorInput) colorInput.value = '#ff0000';
    if (typeInput) typeInput.value = 'point';
    if (sizeInput) {
      sizeInput.value = 12;
      const sizeDisplay = document.getElementById('marker-size-display');
      if (sizeDisplay) sizeDisplay.textContent = '12px';
    }
    
    popup.style.display = 'block';
  }
}

/**
 * 處理地圖點擊（文字模式）
 */
function handleMapClickForLabel(e) {
  if (!labelAddMode || !map) return;
  
  const coordinates = [e.lngLat.lng, e.lngLat.lat];
  
  // 存儲待添加的文字數據
  pendingLabelData = {
    coordinates: coordinates,
    lngLat: e.lngLat
  };
  
  // 顯示文字添加彈出框
  const popup = document.getElementById('label-add-popup');
  if (popup) {
    // 重置表單
    const textInput = document.getElementById('label-text-input');
    const sizeInput = document.getElementById('label-size-input');
    const colorInput = document.getElementById('label-color-input');
    const bgColorInput = document.getElementById('label-bg-color-input');
    
    if (textInput) textInput.value = '';
    if (sizeInput) {
      sizeInput.value = 14;
      const sizeDisplay = document.getElementById('label-size-display');
      if (sizeDisplay) sizeDisplay.textContent = '14px';
    }
    if (colorInput) colorInput.value = '#333333';
    if (bgColorInput) bgColorInput.value = '#ffffff';
    
    popup.style.display = 'block';
    if (textInput) textInput.focus();
  }
}

/**
 * 確認添加標記
 */
function confirmAddMarker() {
  if (!pendingMarkerData || !markerManager || !stageController) {
    return;
  }
  
  const nameInput = document.getElementById('marker-name-input');
  const colorInput = document.getElementById('marker-color-input');
  const typeInput = document.getElementById('marker-type-input');
  const sizeInput = document.getElementById('marker-size-input');
  
  const name = nameInput?.value.trim() || `標記 ${Date.now()}`;
  const color = colorInput?.value || '#ff0000';
  const type = typeInput?.value || 'point';
  const size = parseInt(sizeInput?.value) || 12;
  
  // 生成唯一 ID
  const markerId = `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 創建標記數據
  const markerData = {
    id: markerId,
    name: name,
    coordinates: pendingMarkerData.coordinates,
    type: type,
    color: color,
    size: size
  };
  
  // 添加到狀態
  stageController.addMarker(markerData);
  
  // 添加到地圖
  markerManager.addMarker(markerData);
  
  // 關閉彈出框
  const popup = document.getElementById('marker-add-popup');
  if (popup) popup.style.display = 'none';
  
  // 清空待添加數據
  pendingMarkerData = null;
  
  logger.info('Marker added:', markerData);
  
  // 更新內容列表
  if (contentListManager) {
    contentListManager.updateContentList();
  }
}

/**
 * 取消添加標記
 */
function cancelAddMarker() {
  const popup = document.getElementById('marker-add-popup');
  if (popup) popup.style.display = 'none';
  pendingMarkerData = null;
}

/**
 * 確認添加文字
 */
function confirmAddLabel() {
  if (!pendingLabelData || !labelManager || !stageController) {
    return;
  }
  
  const textInput = document.getElementById('label-text-input');
  const sizeInput = document.getElementById('label-size-input');
  const colorInput = document.getElementById('label-color-input');
  const bgColorInput = document.getElementById('label-bg-color-input');
  
  const text = textInput?.value.trim();
  if (!text) {
    alert('請輸入文字內容');
    return;
  }
  
  const fontSize = parseInt(sizeInput?.value) || 14;
  const color = colorInput?.value || '#333333';
  const backgroundColor = bgColorInput?.value || '#ffffff';
  
  // 生成唯一 ID
  const labelId = `label-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 創建文字標籤數據
  const labelData = {
    id: labelId,
    text: text,
    coordinates: pendingLabelData.coordinates,
    fontSize: fontSize,
    color: color,
    backgroundColor: backgroundColor,
    padding: 4
  };
  
  // 添加到狀態
  stageController.addTextLabel(labelData);
  
  // 添加到地圖
  labelManager.addLabel(labelData);
  
  // 關閉彈出框
  const popup = document.getElementById('label-add-popup');
  if (popup) popup.style.display = 'none';
  
  // 清空待添加數據
  pendingLabelData = null;
  
  logger.info('Label added:', labelData);
  
  // 更新內容列表
  if (contentListManager) {
    contentListManager.updateContentList();
  }
}

/**
 * 取消添加文字
 */
function cancelAddLabel() {
  const popup = document.getElementById('label-add-popup');
  if (popup) popup.style.display = 'none';
  pendingLabelData = null;
}

/**
 * 設置導出對話框
 */
function setupExportDialog() {
  const overlay = document.getElementById('export-dialog-overlay');
  const closeBtn = document.getElementById('export-dialog-close');
  const cancelBtn = document.getElementById('export-dialog-cancel');
  const exportBtn = document.getElementById('export-dialog-export');
  const paperSizeSelect = document.getElementById('export-paper-size');
  const dpiSelect = document.getElementById('export-dpi');
  const formatRadios = document.querySelectorAll('input[name="export-format"]');
  const qualitySlider = document.getElementById('export-quality');
  const qualityValue = document.getElementById('export-quality-value');
  const qualityGroup = document.getElementById('export-quality-group');
  const dimensionsPreview = document.getElementById('export-dimensions-preview');
  
  if (!overlay) {
    if (logger) logger.warn('Export dialog overlay not found');
    return;
  }
  
  function closeDialog() {
    overlay.style.display = 'none';
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeDialog);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeDialog);
  }
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });
  
  // 格式變化時顯示/隱藏質量選項
  formatRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (qualityGroup) {
        qualityGroup.style.display = radio.value === 'jpeg' ? 'block' : 'none';
      }
      updateDimensionsPreview();
    });
  });
  
  // 質量滑塊
  if (qualitySlider && qualityValue) {
    qualitySlider.addEventListener('input', (e) => {
      qualityValue.textContent = e.target.value;
    });
  }
  
  // 更新尺寸預覽
  function updateDimensionsPreview() {
    if (!exportManager || !dimensionsPreview) return;
    
    const paperSize = paperSizeSelect?.value || 'custom';
    const orientation = document.querySelector('input[name="export-orientation"]:checked')?.value || 'portrait';
    const dpi = parseInt(dpiSelect?.value || 300);
    
    try {
      const dims = exportManager.calculateDimensions(paperSize, orientation, dpi);
      dimensionsPreview.textContent = `${dims.width.toLocaleString()} × ${dims.height.toLocaleString()} px (~${dims.sizeMB}MB at ${dpi} DPI)`;
    } catch (error) {
      dimensionsPreview.textContent = '計算尺寸時發生錯誤';
    }
  }
  
  // 存儲更新函數供外部調用
  window.updateExportDimensionsPreview = updateDimensionsPreview;
  
  if (paperSizeSelect) {
    paperSizeSelect.addEventListener('change', updateDimensionsPreview);
  }
  
  if (dpiSelect) {
    dpiSelect.addEventListener('change', updateDimensionsPreview);
  }
  
  document.querySelectorAll('input[name="export-orientation"]').forEach(radio => {
    radio.addEventListener('change', updateDimensionsPreview);
  });
  
  // 匯出按鈕
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const paperSize = paperSizeSelect?.value || 'custom';
      const orientation = document.querySelector('input[name="export-orientation"]:checked')?.value || 'portrait';
      const dpi = parseInt(dpiSelect?.value || 300);
      const format = document.querySelector('input[name="export-format"]:checked')?.value || 'png';
      const quality = parseInt(qualitySlider?.value || 90) / 100;
      
      try {
        closeDialog();
        
        if (logger) {
          logger.info('Exporting map...', { paperSize, orientation, dpi, format, quality });
        }
        
        await exportManager.exportMap({
          paperSize,
          orientation,
          dpi,
          format,
          quality
        });
        
        if (logger) {
          logger.info('Map exported successfully');
        }
      } catch (error) {
        if (logger) {
          logger.error('Export failed:', error);
        }
        alert('匯出失敗: ' + (error.message || '請稍後再試'));
      }
    });
  }
  
  // 初始更新尺寸預覽
  setTimeout(updateDimensionsPreview, 100);
}

/**
 * 顯示導出對話框
 */
function showExportDialog() {
  const overlay = document.getElementById('export-dialog-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    // 更新尺寸預覽
    setTimeout(() => {
      if (window.updateExportDimensionsPreview) {
        window.updateExportDimensionsPreview();
      }
    }, 100);
  }
}

/**
 * 更新 UI
 * @param {Object} state - 工作流狀態
 */
function updateUI(state) {
  const currentStage = state.currentStage;

  // 更新工作流指示器
  document.querySelectorAll('.workflow-stage').forEach(stageEl => {
    const stage = stageEl.dataset.stage;
    stageEl.classList.remove('active', 'completed', 'skipped');
    
    // 獲取階段數據
    const stageData = state[stage + 'Stage'];
    const icon = stageEl.querySelector('.stage-icon');
    
    if (stage === currentStage) {
      // 當前階段
      stageEl.classList.add('active');
      if (icon) {
        icon.textContent = '🔵';
      }
    } else if (stageData) {
      // 非當前階段，根據狀態顯示
      if (stageData.status === 'completed') {
        stageEl.classList.add('completed');
        if (icon) icon.textContent = '✅';
      } else if (stageData.status === 'skipped') {
        stageEl.classList.add('skipped');
        if (icon) icon.textContent = '⏭️';
      } else {
        // pending 狀態
        if (icon) icon.textContent = '⭕';
      }
    } else {
      // 沒有階段數據（如 export 階段）
      if (icon) icon.textContent = '⭕';
    }
  });

  // 更新階段面板顯示
  document.querySelectorAll('.stage-panel').forEach(panel => {
    const panelStage = panel.dataset.stage;
    if (panelStage === currentStage) {
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
  });
  
  // 更新階段操作按鈕顯示
  document.querySelectorAll('.stage-actions').forEach(actions => {
    actions.style.display = 'none';
  });
  const activeStageActions = document.getElementById(currentStage + '-stage-actions');
  if (activeStageActions && currentStage !== 'export') {
    activeStageActions.style.display = 'flex';
  }
}

/**
 * 處理搜尋請求（參考 hkn 項目的實現）
 * @param {string} query - 搜尋查詢
 * @param {string} stage - 階段（'country' 或 'administration'）
 */
async function handleSearch(query, stage) {
  if (!map) {
    logger.warn('Map not initialized');
    return;
  }

  if (!stageController || !boundaryManager) {
    logger.warn('StageController or BoundaryManager not initialized');
    return;
  }

  try {
    // 使用 LocationResolver 解析位置
    const locationResolver = typeof window !== 'undefined' && window.LocationResolver 
      ? new window.LocationResolver({ eventBus, logger })
      : null;

    if (!locationResolver) {
      logger.warn('LocationResolver not available');
      return;
    }

    // 如果是國家階段，嘗試解析為國家代碼
    if (stage === 'country') {
      logger.info(`[handleSearch] Calling handleCountrySearch for: ${query}`);
      await handleCountrySearch(query, locationResolver);
    } else {
      // 行政區階段：搜索並添加行政區
      logger.info(`[handleSearch] Calling handleAdministrationSearch for: ${query}`);
      await handleAdministrationSearch(query, locationResolver);
    }
  } catch (error) {
    logger.error('[handleSearch] Search error:', error);
    logger.error('[handleSearch] Error stack:', error.stack);
    alert('搜尋時發生錯誤，請稍後再試。');
  }
}

/**
 * 處理行政區階段搜尋
 * @param {string} query - 搜尋查詢（行政區名稱）
 * @param {LocationResolver} locationResolver - 位置解析器
 */
async function handleAdministrationSearch(query, locationResolver) {
  try {
    logger.info(`[handleAdministrationSearch] Starting search for: ${query}`);
    
    // 城市到行政区的直接映射表（中文城市名称 -> GADM GID）
    // 这个映射表优先于搜索索引，提供快速准确的匹配
    const cityToAdminMap = {
      // 俄罗斯城市
      '莫斯科': { gid: 'RUS.43_1', name: 'Moscow City', country: 'RUS' },
      '聖彼得堡': { gid: 'RUS.78_1', name: 'Saint Petersburg', country: 'RUS' },
      '圣彼得堡': { gid: 'RUS.78_1', name: 'Saint Petersburg', country: 'RUS' },
      // 美国城市
      '華盛頓': { gid: 'USA.11_1', name: 'District of Columbia', country: 'USA' },
      '华盛顿': { gid: 'USA.11_1', name: 'District of Columbia', country: 'USA' },
      '華盛頓特區': { gid: 'USA.11_1', name: 'District of Columbia', country: 'USA' },
      '华盛顿特区': { gid: 'USA.11_1', name: 'District of Columbia', country: 'USA' },
      '紐約': { gid: 'USA.36_1', name: 'New York', country: 'USA' },
      '纽约': { gid: 'USA.36_1', name: 'New York', country: 'USA' },
      '洛杉磯': { gid: 'USA.6_1', name: 'California', country: 'USA' }, // Los Angeles is in CA
      '洛杉矶': { gid: 'USA.6_1', name: 'California', country: 'USA' },
      // 台湾城市
      '台北': { gid: 'TWN.4_1', name: 'Taipei City', country: 'TWN' },
      '臺北': { gid: 'TWN.4_1', name: 'Taipei City', country: 'TWN' },
      '新北': { gid: 'TWN.3_1', name: 'New Taipei City', country: 'TWN' },
      '桃園': { gid: 'TWN.13_1', name: 'Taoyuan', country: 'TWN' },
      '台中': { gid: 'TWN.12_1', name: 'Taichung City', country: 'TWN' },
      '臺中': { gid: 'TWN.12_1', name: 'Taichung City', country: 'TWN' },
      '台南': { gid: 'TWN.15_1', name: 'Tainan City', country: 'TWN' },
      '高雄': { gid: 'TWN.2_1', name: 'Kaohsiung City', country: 'TWN' }
    };
    
    // 检查是否是已知的城市（优先使用直接映射）
    const queryClean = query.replace(/[市縣省州]/g, '').trim();
    const cityMapping = cityToAdminMap[query] || cityToAdminMap[queryClean];
    
    if (cityMapping) {
      logger.info(`[handleAdministrationSearch] Found direct city mapping: ${query} -> ${cityMapping.gid} (${cityMapping.name})`);
      
      // 检查国家是否在选中的国家列表中
      const state = stateManager.getState();
      const countryAreas = state.countryStage?.areas || [];
      const matchedCountry = countryAreas.find(a => {
        const code = (a.gadmId || a.id).toUpperCase();
        return code === cityMapping.country;
      });
      
      if (!matchedCountry) {
        logger.warn(`[handleAdministrationSearch] Country ${cityMapping.country} not found in selected countries`);
        alert(`請先在國家區域階段選擇 ${cityMapping.country} (${cityMapping.name})`);
        return;
      }
      
      // 使用预定义坐标进行缩放
      const CITY_COORDINATES_MAP = window.CITY_COORDINATES_MAP || {};
      const predefCoords = CITY_COORDINATES_MAP[query] || CITY_COORDINATES_MAP[queryClean];
      if (predefCoords) {
        map.flyTo({
          center: predefCoords,
          zoom: 8,
          duration: 1500,
          essential: true
        });
        logger.info(`Zoomed to predefined location: [${predefCoords[0]}, ${predefCoords[1]}]`);
      }
      
      // 直接获取该行政区的数据
      const apiUrl = `/api/gadm?gadmId=${encodeURIComponent(cityMapping.country)}&level=1`;
      logger.info(`[handleAdministrationSearch] Fetching from API: ${apiUrl}`);
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const geojson = await response.json();
        
        // 在 GeoJSON 中找到对应的 feature
        const matchedFeature = geojson.features?.find(f => {
          const featureGid = (f.properties.GID_1 || f.properties.gid_1 || '').toUpperCase();
          return featureGid === cityMapping.gid.toUpperCase();
        });
        
        if (matchedFeature) {
          const props = matchedFeature.properties || {};
          const gid1 = cityMapping.gid;
          const gadmIdParts = String(gid1).split('_');
          const gadmId = gadmIdParts[0] || gid1;
          
          // 使用映射中的名称，或从 feature properties 获取
          const adminName = cityMapping.name || props.NL_NAME_1 || props.NAME_1 || query;
          
          logger.info(`[handleAdministrationSearch] Found administrative region via direct mapping: ${adminName} (${gadmId})`);
          
          // 預設顏色
          const defaultColors = ['#6CA7A1', '#496F96', '#E05C5A', '#EDBD76', '#E8DFCF', '#B5CBCD'];
          const stageData = state.administrationStage;
          const colorIndex = (stageData?.areas?.length || 0) % defaultColors.length;
          const color = defaultColors[colorIndex];

          // 創建區域對象
          const area = {
            id: gadmId,
            gadmId: gadmId,
            name: adminName,
            color: color,
            opacity: 0.7
          };

          logger.info(`Attempting to add administrative area: ${JSON.stringify(area)}`);

          // 使用 StageController 添加區域
          if (!stageController) {
            logger.error('StageController not initialized');
            throw new Error('StageController not initialized');
          }
          
          stageController.addArea('administration', area);
          logger.info(`Area added to state: ${adminName}`);
          
          // 自動縮放到該區域
          try {
            // 計算簡單的 bbox
            const geometry = matchedFeature.geometry;
            let bbox = null;
            
            if (geometry.type === 'Polygon' && geometry.coordinates) {
              const coords = geometry.coordinates[0]; // 外環
              const lngs = coords.map(c => c[0]);
              const lats = coords.map(c => c[1]);
              bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
            } else if (geometry.type === 'MultiPolygon' && geometry.coordinates) {
              const allLngs = [];
              const allLats = [];
              geometry.coordinates.forEach(polygon => {
                polygon[0].forEach(coord => {
                  allLngs.push(coord[0]);
                  allLats.push(coord[1]);
                });
              });
              bbox = [Math.min(...allLngs), Math.min(...allLats), Math.max(...allLngs), Math.max(...allLats)];
            }
            
            if (bbox) {
              map.fitBounds(bbox, {
                padding: 50,
                duration: 1500
              });
              logger.info(`Zoomed to administrative region: ${adminName}`);
            }
          } catch (error) {
            logger.error('Error calculating bounds:', error);
          }
          
          return; // 成功添加，直接返回
        } else {
          logger.warn(`[handleAdministrationSearch] Feature with GID ${cityMapping.gid} not found in GeoJSON`);
          // 继续使用常规搜索流程
        }
      } else {
        logger.warn(`[handleAdministrationSearch] Failed to fetch GeoJSON for ${cityMapping.country}`);
        // 继续使用常规搜索流程
      }
    }
    
    // 如果没有直接映射，继续使用常规搜索流程
    // 首先獲取座標（用於縮放）
    const coordinates = await locationResolver.resolve(query);
    if (coordinates && coordinates.length === 2) {
      map.flyTo({
        center: coordinates,
        zoom: 8,
        duration: 1500,
        essential: true
      });
      logger.info(`Zoomed to location: [${coordinates[0]}, ${coordinates[1]}]`);
    }

    // 嘗試通過服務器端 API 搜索行政區
    // 先獲取國家代碼（從當前國家階段、座標反推或查詢推斷）
    const state = stateManager.getState();
    const countryAreas = state.countryStage?.areas || [];
    logger.info(`[handleAdministrationSearch] Country areas found: ${countryAreas.length}`);
    
    let countryCode = null;
    
    // 方法1: 優先使用 Mapbox Geocoding API 反向地理編碼（根據座標推斷國家）
    if (coordinates && coordinates.length === 2 && countryAreas.length > 0) {
      try {
        const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
        const token = CONFIG.MAPBOX?.TOKEN;
        
        if (token) {
          const [lng, lat] = coordinates;
          const reverseGeocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=country&limit=1`;
          
          logger.info(`[handleAdministrationSearch] Attempting reverse geocoding for [${lng}, ${lat}]`);
          const reverseResponse = await fetch(reverseGeocodeUrl);
          
          if (reverseResponse.ok) {
            const reverseData = await reverseResponse.json();
            if (reverseData.features && reverseData.features.length > 0) {
              // Mapbox 返回的國家代碼可能是 ISO 3166-1 alpha-2 (例如 "RU" for Russia)
              const countryCodeFromMapbox = reverseData.features[0].properties?.short_code?.toUpperCase();
              
              if (countryCodeFromMapbox) {
                logger.info(`[handleAdministrationSearch] Mapbox returned country code: ${countryCodeFromMapbox}`);
                
                // 檢查是否在選中的國家列表中（需要將 ISO 代碼轉換為 GADM 代碼）
                // 對於大多數國家，ISO 代碼和 GADM 代碼相同，但有些例外（例如 UK vs GBR）
                const countryMapping = {
                  'RU': 'RUS',
                  'TW': 'TWN',
                  'CN': 'CHN',
                  'US': 'USA',
                  'GB': 'GBR',
                  'KR': 'KOR',
                  'KP': 'PRK'
                };
                
                const gadmCode = countryMapping[countryCodeFromMapbox] || countryCodeFromMapbox;
                const matchedCountry = countryAreas.find(a => {
                  const code = (a.gadmId || a.id).toUpperCase();
                  return code === gadmCode || code.startsWith(gadmCode);
                });
                
                if (matchedCountry) {
                  countryCode = matchedCountry.gadmId || matchedCountry.id;
                  logger.info(`[handleAdministrationSearch] Matched country from reverse geocoding: ${countryCode}`);
                }
              }
            }
          }
        }
      } catch (error) {
        logger.warn(`[handleAdministrationSearch] Reverse geocoding failed:`, error);
      }
    }
    
    // 方法2: 根據查詢內容推斷（城市名稱映射）
    if (!countryCode) {
      const queryClean = query.replace(/[市縣省州]/g, '').trim();
      
      // 城市到國家代碼的映射（可擴展）
      const cityToCountryMap = {
        '莫斯科': 'RUS',
        '聖彼得堡': 'RUS',
        '台北': 'TWN',
        '新北': 'TWN',
        '桃園': 'TWN',
        '台中': 'TWN',
        '台南': 'TWN',
        '高雄': 'TWN',
        '北京': 'CHN',
        '上海': 'CHN',
        '紐約': 'USA',
        '洛杉磯': 'USA',
        '芝加哥': 'USA'
      };
      
      for (const [city, code] of Object.entries(cityToCountryMap)) {
        if (queryClean.includes(city)) {
          // 檢查該國家是否在選中的國家列表中
          const matchedCountry = countryAreas.find(a => {
            const areaCode = (a.gadmId || a.id).toUpperCase();
            return areaCode === code.toUpperCase();
          });
          
          if (matchedCountry) {
            countryCode = matchedCountry.gadmId || matchedCountry.id;
            logger.info(`[handleAdministrationSearch] Inferred country from city name "${city}": ${countryCode}`);
            break;
          }
        }
      }
    }
    
    // 方法3: 根據座標範圍粗略判斷（fallback）
    if (!countryCode && coordinates && coordinates.length === 2 && countryAreas.length > 0) {
      const [lng, lat] = coordinates;
      
      // 俄羅斯範圍（粗略）
      if (lng >= 19 && lng <= 180 && lat >= 41 && lat <= 82) {
        const rusArea = countryAreas.find(a => {
          const code = (a.gadmId || a.id).toUpperCase();
          return code === 'RUS';
        });
        if (rusArea) {
          countryCode = rusArea.gadmId || rusArea.id;
          logger.info(`[handleAdministrationSearch] Inferred country from coordinates (RUS range): ${countryCode}`);
        }
      }
      
      // 台灣範圍（粗略）
      if (!countryCode && lng >= 119 && lng <= 122 && lat >= 21 && lat <= 26) {
        const twnArea = countryAreas.find(a => {
          const code = (a.gadmId || a.id).toUpperCase();
          return code === 'TWN';
        });
        if (twnArea) {
          countryCode = twnArea.gadmId || twnArea.id;
          logger.info(`[handleAdministrationSearch] Inferred country from coordinates (TWN range): ${countryCode}`);
        }
      }
    }
    
    // 方法4: 如果還是沒有，使用第一個選中的國家（最終 fallback）
    if (!countryCode && countryAreas.length > 0) {
      countryCode = countryAreas[0].gadmId || countryAreas[0].id;
      logger.info(`[handleAdministrationSearch] Using first country from stage (fallback): ${countryCode}`);
    }
    
    // 方法5: 嘗試從查詢推斷（台灣特例）
    if (!countryCode) {
      if (query.includes('台北') || query.includes('新北') || query.includes('桃園') || 
          query.includes('台中') || query.includes('台南') || query.includes('高雄') ||
          query.includes('台灣') || query.includes('臺灣')) {
        countryCode = 'TWN';
        logger.info(`[handleAdministrationSearch] Inferred country code from query (TWN): ${countryCode}`);
      }
    }

    if (!countryCode) {
      logger.warn('[handleAdministrationSearch] No country code found, cannot search for administrative region');
      alert('請先在國家區域階段選擇國家，或確保查詢包含國家信息');
      return;
    }

    // 通過服務器端 API 搜索行政區（使用名稱匹配）
    // 服務器會從分割後的國家文件中搜索匹配的行政區
    logger.info(`[handleAdministrationSearch] Searching for administrative region: ${query} in country: ${countryCode}`);
    
    // 先獲取該國家的所有行政區，然後在客戶端過濾
    const apiUrl = `/api/gadm?gadmId=${encodeURIComponent(countryCode)}&level=1`;
    logger.info(`[handleAdministrationSearch] Fetching from API: ${apiUrl}`);
    const response = await fetch(apiUrl);
    logger.info(`[handleAdministrationSearch] API response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const geojson = await response.json();
      logger.info(`[handleAdministrationSearch] Received GeoJSON with ${geojson?.features?.length || 0} features`);
      
      if (geojson && geojson.features && geojson.features.length > 0) {
        let matchedFeature = null;
        let matchedGid = null;
        let adminName = query;

        // 優先使用 GADM 搜索索引（如果已加載）
        if (gadmSearchIndex && gadmSearchIndex.isLevel1Loaded()) {
          const results = gadmSearchIndex.search(query, 1, countryCode);
          
          if (results.length > 0) {
            const bestMatch = results[0];
            matchedGid = bestMatch.gid;
            // 優先使用中文名稱，其次英文名稱，最後本地名稱
            adminName = bestMatch.names.en?.[0] || 
                       bestMatch.names.local?.[0] || 
                       bestMatch._properties?.NAME_1 || 
                       query;
            
            logger.info(`[handleAdministrationSearch] Found via search index: ${matchedGid} (${adminName}, score: ${bestMatch.matchScore})`);
            
            // 在 GeoJSON 中找到對應的 feature
            matchedFeature = geojson.features.find(f => {
              const featureGid = (f.properties.GID_1 || f.properties.gid_1 || '').toUpperCase();
              return featureGid === matchedGid || 
                     featureGid.includes(matchedGid) || 
                     matchedGid.includes(featureGid);
            });
          }
        }

        // Fallback: 使用原有的搜索邏輯（如果索引未加載或無結果）
        if (!matchedFeature) {
          const queryUpper = query.toUpperCase();
          logger.info(`[handleAdministrationSearch] Searching for query: ${queryUpper} in ${geojson.features.length} features (fallback mode)`);
          
          // 先列出所有可用的行政區名稱（用於調試）
          if (CONFIG && CONFIG.DEBUG) {
            const availableNames = geojson.features.slice(0, 5).map(f => {
              const p = f.properties || {};
              const names = [p.NAME_1, p.NL_NAME_1, p.VARNAME_1].filter(Boolean);
              return names.length > 0 ? names.join('/') : `GID:${p.GID_1}`;
            });
            logger.info(`[handleAdministrationSearch] Sample regions: ${availableNames.join(', ')}...`);
          }
          
          matchedFeature = geojson.features.find(feature => {
            const props = feature.properties || {};
            const name1 = String(props.NAME_1 || '').toUpperCase();
            const nlName1 = String(props.NL_NAME_1 || '').toUpperCase();
            const varname1 = String(props.VARNAME_1 || '').toUpperCase();
            
            // 移除常見後綴進行匹配（例如 "台北市" 匹配 "台北"）
            const queryClean = queryUpper.replace(/[市縣省州]/g, '');
            const name1Clean = name1.replace(/[市縣省州]/g, '');
            const nlName1Clean = nlName1.replace(/[市縣省州]/g, '');
            
            const matches = name1.includes(queryUpper) || 
                   nlName1.includes(queryUpper) ||
                   varname1.includes(queryUpper) ||
                   name1Clean.includes(queryClean) ||
                   nlName1Clean.includes(queryClean);
            
            if (matches) {
              logger.info(`[handleAdministrationSearch] Match found (fallback): ${props.NL_NAME_1 || props.NAME_1} (GID_1: ${props.GID_1})`);
            }
            
            return matches;
          });

          if (matchedFeature) {
            const props = matchedFeature.properties || {};
            if (!matchedGid) {
              matchedGid = props.GID_1 || props.gid_1 || '';
            }
            if (!adminName || adminName === query) {
              adminName = props.NL_NAME_1 || props.NAME_1 || props.NAME_1_EN || query;
            }
          }
        }

        if (matchedFeature) {
          const props = matchedFeature.properties || {};
          const gid1 = matchedGid || props.GID_1 || props.gid_1 || '';
          
          // 確保 adminName 已正確設置
          if (!adminName || adminName === query) {
            adminName = props.NL_NAME_1 || props.NAME_1 || props.NAME_1_EN || props.STATE_NAME || props.PROVINCE_NAME || query;
          }
          
          // 構建 GADM ID（移除 _1 後綴，使用標準格式）
          const gadmIdParts = String(gid1).split('_');
          const gadmId = gadmIdParts[0] || gid1; // 例如 "TWN.3_1" -> "TWN.3"
          
          logger.info(`[handleAdministrationSearch] Found administrative region: ${adminName} (${gadmId})`);
          
          // 預設顏色
          const defaultColors = ['#6CA7A1', '#496F96', '#E05C5A', '#EDBD76', '#E8DFCF', '#B5CBCD'];
          const stageData = state.administrationStage;
          const colorIndex = (stageData?.areas?.length || 0) % defaultColors.length;
          const color = defaultColors[colorIndex];

          // 創建區域對象
          const area = {
            id: gadmId,
            gadmId: gadmId,
            name: adminName,
            color: color,
            opacity: 0.7
          };

          logger.info(`Attempting to add administrative area: ${JSON.stringify(area)}`);

          // 使用 StageController 添加區域
          if (!stageController) {
            logger.error('StageController not initialized');
            throw new Error('StageController not initialized');
          }
          
          stageController.addArea('administration', area);
          logger.info(`Area added to state: ${adminName}`);
          
          // 使用 BoundaryManager 添加邊界
          if (!boundaryManager) {
            logger.error('BoundaryManager not initialized');
            throw new Error('BoundaryManager not initialized');
          }
          
          try {
            // 在添加填充的行政區之前，先移除對應的預覽邊界（如果存在）
            const adminSourceId = 'boundary-source-administration';
            const adminSource = map.getSource(adminSourceId);
            if (adminSource && adminSource.type === 'geojson') {
              const currentData = adminSource._data || { type: 'FeatureCollection', features: [] };
              const previewFeatureIds = [
                `preview-${countryCode}-${gid1}`,
                `preview-${countryCode}-${gadmId}`
              ];
              
              // 移除預覽邊界
              const filteredFeatures = (currentData.features || []).filter(f => {
                const fid = f.id || '';
                return !previewFeatureIds.includes(fid) && !fid.startsWith(`preview-${countryCode}-${gid1}`) && !fid.startsWith(`preview-${countryCode}-${gadmId}`);
              });
              
              if (filteredFeatures.length < currentData.features.length) {
                adminSource.setData({
                  type: 'FeatureCollection',
                  features: filteredFeatures
                });
                logger.info(`[handleAdministrationSearch] Removed ${currentData.features.length - filteredFeatures.length} preview boundary(ies) before adding filled area`);
              }
            }
            
            await boundaryManager.addArea('administration', area);
            logger.info(`Added administrative area: ${adminName} (${gadmId}) with color ${color}`);
            
            // 確保邊界可見並使用填充模式
            if (boundaryManager) {
              boundaryManager.setVisibility('administration', true);
              boundaryManager.setMode('administration', 'fill');
              
              // 驗證圖層
              const fillLayerId = `boundary-fill-administration`;
              const sourceId = `boundary-source-administration`;
              if (map.getSource(sourceId)) {
                const sourceData = map.getSource(sourceId)._data;
                logger.info(`Boundary source data: ${sourceData?.features?.length || 0} features`);
              }
              if (map.getLayer(fillLayerId)) {
                const layer = map.getLayer(fillLayerId);
                logger.info(`Boundary fill layer visibility: ${map.getLayoutProperty(fillLayerId, 'visibility')}`);
              }
            }
            
            // 縮放到行政區（使用 feature 的 bbox 或中心點）
            if (matchedFeature.geometry) {
              let bbox = null;
              if (matchedFeature.bbox) {
                bbox = matchedFeature.bbox;
              } else if (matchedFeature.geometry.type === 'Polygon' && matchedFeature.geometry.coordinates[0]) {
                // 計算簡單的 bbox
                const coords = matchedFeature.geometry.coordinates[0];
                const lngs = coords.map(c => c[0]);
                const lats = coords.map(c => c[1]);
                bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
              } else if (matchedFeature.geometry.type === 'MultiPolygon') {
                // 處理 MultiPolygon
                const allCoords = matchedFeature.geometry.coordinates.flat(2);
                const lngs = allCoords.map(c => c[0]);
                const lats = allCoords.map(c => c[1]);
                bbox = [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
              }
              
              if (bbox) {
                map.fitBounds(bbox, {
                  padding: 50,
                  duration: 1500
                });
                logger.info(`Zoomed to administrative region: ${adminName}`);
              }
            }
          } catch (error) {
            logger.error('Error adding administrative area:', error);
            throw error;
          }
        } else {
          logger.warn(`[handleAdministrationSearch] No matching administrative region found for: ${query}`);
          // 列出所有可用的行政區名稱以便調試
          const availableNames = geojson.features.map(f => {
            const p = f.properties || {};
            return `${p.NL_NAME_1 || p.NAME_1}`;
          }).join(', ');
          logger.info(`[handleAdministrationSearch] Available regions: ${availableNames}`);
          alert(`未找到匹配的行政區：${query}\n可用的行政區：${availableNames.substring(0, 100)}...`);
        }
      } else {
        logger.warn(`[handleAdministrationSearch] No administrative regions found for country: ${countryCode}`);
        alert(`未找到 ${countryCode} 的行政區數據`);
      }
    } else {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error(`[handleAdministrationSearch] Failed to fetch administrative regions: ${response.status} - ${errorText}`);
      alert(`獲取行政區數據失敗 (${response.status})，請稍後再試`);
    }
  } catch (error) {
    logger.error('[handleAdministrationSearch] Administration search error:', error);
    logger.error('[handleAdministrationSearch] Error stack:', error.stack);
    alert('搜尋行政區時發生錯誤，請稍後再試。');
  }
}

/**
 * 處理國家階段搜尋（參考 hkn 項目，直接套色）
 * @param {string} query - 搜尋查詢
 * @param {LocationResolver} locationResolver - 位置解析器
 */
async function handleCountrySearch(query, locationResolver) {
  try {
    let countryCode = null;
    let countryName = query;

    // 優先使用 GADM 搜索索引（如果已加載）
    if (gadmSearchIndex && gadmSearchIndex.isLevel0Loaded()) {
      const results = gadmSearchIndex.search(query, 0);
      
      if (results.length > 0) {
        const bestMatch = results[0];
        countryCode = bestMatch.code;
        // 優先使用中文名稱，其次英文名稱
        countryName = bestMatch.names.local?.[0] || 
                     bestMatch.names.en?.[0] || 
                     query;
        
        logger.info(`[handleCountrySearch] Found via search index: ${countryCode} (${countryName}, score: ${bestMatch.matchScore})`);
        
        if (results.length > 1 && results[1].matchScore >= bestMatch.matchScore - 10) {
          logger.info(`[handleCountrySearch] Multiple matches: ${results.slice(0, 3).map(r => `${r.code}(${r.matchScore})`).join(', ')}`);
        }
      }
    }

    // Fallback: 使用現有的 CountryCodes（如果索引未加載或無結果）
    if (!countryCode) {
      const CountryCodes = typeof window !== 'undefined' ? window.CountryCodes : null;
      
      if (CountryCodes) {
        // 優先使用增強的搜尋功能（支持模糊匹配）
        if (typeof CountryCodes.search === 'function') {
          const results = CountryCodes.search(query.trim());
          
          if (results.length > 0) {
            const bestMatch = results[0];
            countryCode = bestMatch.code;
            countryName = bestMatch.name;
            
            logger.info(`[handleCountrySearch] Found via CountryCodes.search: ${countryCode} (${countryName}, ${bestMatch.nameEn})`);
          }
        }
        
        // Fallback: 使用精確匹配
        if (!countryCode) {
          countryCode = CountryCodes.findByChineseName(query.trim());
          if (countryCode) {
            countryName = CountryCodes.get(countryCode)?.name || query;
            logger.info(`[handleCountrySearch] Found via Chinese name (exact): ${countryCode} (${countryName})`);
          } else {
            countryCode = CountryCodes.findByEnglishName(query.trim());
            if (countryCode) {
              countryName = CountryCodes.get(countryCode)?.name || query;
              logger.info(`[handleCountrySearch] Found via English name (exact): ${countryCode} (${countryName})`);
            } else {
              logger.warn(`[handleCountrySearch] Country code not found for: ${query}`);
            }
          }
        }
      } else {
        logger.warn('CountryCodes not available');
      }
    }

    // 如果找不到國家代碼，使用 Mapbox Geocoding API
    if (!countryCode) {
      const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
      const token = CONFIG.MAPBOX?.TOKEN;
      
      if (token) {
        const baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
        const url = `${baseUrl}/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&types=country`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const coordinates = feature.center; // [lng, lat]
            const context = feature.context || [];
            
            // 從 context 中提取國家代碼
            const countryContext = context.find(c => c.id && c.id.startsWith('country.'));
            if (countryContext && countryContext.short_code) {
              countryCode = countryContext.short_code.toUpperCase();
              if (countryCode.length === 2) {
                // 轉換為 ISO 3166-1 alpha-3（簡化版本，只處理常見國家）
                const alpha2ToAlpha3 = {
                  'US': 'USA', 'GB': 'GBR', 'CN': 'CHN', 'JP': 'JPN',
                  'TW': 'TWN', 'KR': 'KOR', 'IN': 'IND', 'FR': 'FRA',
                  'DE': 'DEU', 'IT': 'ITA', 'ES': 'ESP', 'RU': 'RUS',
                  'BR': 'BRA', 'AU': 'AUS', 'CA': 'CAN', 'MX': 'MEX'
                };
                countryCode = alpha2ToAlpha3[countryCode] || countryCode;
              }
              countryName = feature.place_name || query;
              
              // 縮放到位置
              map.flyTo({
                center: coordinates,
                zoom: 4,
                duration: 1500,
                essential: true
              });
            }
          }
        }
      }
    }

    // 如果找到了國家代碼，添加區域並套色
    if (countryCode) {
      logger.info(`Processing country code: ${countryCode} (${countryName})`);
      
      // 預設顏色（參考 hkn 項目的預設顏色）
      const defaultColors = ['#6CA7A1', '#496F96', '#E05C5A', '#EDBD76', '#E8DFCF', '#B5CBCD'];
      const state = stateManager.getState();
      const stageData = state.countryStage;
      const colorIndex = stageData.areas.length % defaultColors.length;
      const color = defaultColors[colorIndex];

      // 創建區域對象
      const area = {
        id: countryCode,
        gadmId: countryCode, // 國家級別的 GADM ID 就是 ISO 代碼
        name: countryName,
        color: color,
        opacity: 0.7
      };

      logger.info(`Attempting to add area: ${JSON.stringify(area)}`);

      // 使用 StageController 添加區域
      try {
        if (!stageController) {
          logger.error('StageController not initialized');
          throw new Error('StageController not initialized');
        }
        
        stageController.addArea('country', area);
        logger.info(`Area added to state: ${countryName}`);
        
        // 使用 BoundaryManager 添加邊界
        if (!boundaryManager) {
          logger.error('BoundaryManager not initialized');
          throw new Error('BoundaryManager not initialized');
        }
        
        try {
          await boundaryManager.addArea('country', area);
          logger.info(`Added country area: ${countryName} (${countryCode}) with color ${color}`);
          
          // 確保邊界可見並使用填充模式（預設）
          if (boundaryManager) {
            // 確保邊界可見
            boundaryManager.setVisibility('country', true);
            // 設置為填充模式
            boundaryManager.setMode('country', 'fill');
            
            // 驗證圖層是否成功創建
            const fillLayerId = `boundary-fill-country`;
            const sourceId = `boundary-source-country`;
            if (map.getSource(sourceId)) {
              const sourceData = map.getSource(sourceId)._data;
              logger.info(`Boundary source data: ${sourceData?.features?.length || 0} features`);
            }
            if (map.getLayer(fillLayerId)) {
              const visibility = map.getLayoutProperty(fillLayerId, 'visibility');
              logger.info(`Boundary fill layer visibility: ${visibility}`);
            } else {
              logger.warn(`Boundary fill layer not found: ${fillLayerId}`);
            }
          }
        } catch (boundaryError) {
          logger.error(`Failed to add boundary for ${countryName}:`, boundaryError);
          logger.error('Error stack:', boundaryError.stack);
          // 不拋出錯誤，讓應用繼續運行
        }
        
        // 縮放到區域（使用 Mapbox Geocoding 獲取中心點）
        try {
          const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
          const token = CONFIG.MAPBOX?.TOKEN;
          if (token) {
            const baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
            const url = `${baseUrl}/${encodeURIComponent(countryName)}.json?access_token=${token}&limit=1&types=country`;
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              if (data.features && data.features.length > 0 && data.features[0].center) {
                const coordinates = data.features[0].center; // [lng, lat]
                map.flyTo({
                  center: coordinates,
                  zoom: 4,
                  duration: 1500,
                  essential: true
                });
                logger.info(`Zoomed to country: ${countryName} at [${coordinates[0]}, ${coordinates[1]}]`);
              }
            }
          }
        } catch (zoomError) {
          logger.warn('Failed to zoom to country:', zoomError);
        }
        
        // 觸發事件
        if (eventBus) {
          eventBus.emit('area:added', { stage: 'country', area });
        }
      } catch (error) {
        logger.error('Error adding area:', error);
        logger.error('Error stack:', error.stack);
        // 如果區域已存在，只縮放
        const coordinates = await locationResolver.resolve(query);
        if (coordinates && coordinates.length === 2) {
          map.flyTo({
            center: coordinates,
            zoom: 4,
            duration: 1500,
            essential: true
          });
        }
      }
    } else {
      // 如果找不到國家代碼，只縮放
      const coordinates = await locationResolver.resolve(query);
      if (coordinates && coordinates.length === 2) {
        map.flyTo({
          center: coordinates,
          zoom: 4,
          duration: 1500,
          essential: true
        });
        logger.info(`Zoomed to location: [${coordinates[0]}, ${coordinates[1]}]`);
      } else {
        logger.warn(`Unable to find country for query: ${query}`);
        alert(`無法找到該國家：${query}\n請嘗試使用完整的中文或英文名稱，例如："台灣"、"Taiwan"、"United States" 等`);
      }
    }
  } catch (error) {
    logger.error('Country search error:', error);
    throw error;
  }
}

// 導出到全局（用於調試）
if (typeof window !== 'undefined') {
  window.initApp = initApp;
  window.app = {
    eventBus: () => eventBus,
    logger: () => logger,
    stateManager: () => stateManager,
    stageManager: () => stageManager,
    stageController: () => stageController,
    map: () => map,
    boundaryManager: () => boundaryManager,
    markerManager: () => markerManager,
    labelManager: () => labelManager,
    exportManager: () => exportManager
  };
  window.addEventListener('DOMContentLoaded', () => {
    initApp().catch(error => {
      console.error('Failed to initialize app:', error);
    });
  });
}

// 如果使用模块系统
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initApp };
}

