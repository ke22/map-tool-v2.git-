/**
 * ContentListManager - 內容列表管理器
 * 
 * 管理「我的地圖內容」面板的顯示和交互
 */

class ContentListManager {
  constructor(stateManager, boundaryManager, eventBus, logger, markerManager = null, labelManager = null) {
    this.stateManager = stateManager;
    this.boundaryManager = boundaryManager;
    this.eventBus = eventBus;
    this.logger = logger;
    this.markerManager = markerManager;
    this.labelManager = labelManager;
    this.selectedAreaId = null;
    this.selectedAreaStage = null;
    this.selectedMarkerId = null;
    this.selectedLabelId = null;
    this.selectedType = null; // 'area', 'marker', 'label'
    
    this.init();
  }

  init() {
    // 監聽區域添加事件
    if (this.eventBus) {
      this.eventBus.on('area:added', (data) => {
        this.updateContentList();
      });
      
      this.eventBus.on('area:removed', (data) => {
        this.updateContentList();
      });
      
      this.eventBus.on('marker:added', (data) => {
        this.updateContentList();
      });
      
      this.eventBus.on('marker:removed', (data) => {
        this.updateContentList();
      });
      
      this.eventBus.on('textLabel:added', (data) => {
        this.updateContentList();
      });
      
      this.eventBus.on('textLabel:removed', (data) => {
        this.updateContentList();
      });
      
      this.eventBus.on('state:update', (data) => {
        this.updateContentList();
      });
    }
    
    // 初始化樣式面板事件
    this.initStylePanelEvents();
    
    // 初始更新列表
    this.updateContentList();
  }

  /**
   * 更新內容列表
   */
  updateContentList() {
    const listContainer = document.getElementById('content-list');
    const areasCountEl = document.getElementById('areas-count');
    const markersCountEl = document.getElementById('markers-count');
    
    if (!listContainer) return;
    
    const state = this.stateManager.getState();
    const allAreas = [];
    
    // 收集所有區域
    if (state.countryStage && state.countryStage.areas) {
      state.countryStage.areas.forEach(area => {
        allAreas.push({
          ...area,
          stage: 'country',
          stageLabel: '國家區域'
        });
      });
    }
    
    if (state.administrationStage && state.administrationStage.areas) {
      state.administrationStage.areas.forEach(area => {
        allAreas.push({
          ...area,
          stage: 'administration',
          stageLabel: '行政區'
        });
      });
    }
    
    const markers = state.annotations?.markers || [];
    const textLabels = state.annotations?.textLabels || [];
    
    // 更新計數
    const labelsCountEl = document.getElementById('labels-count');
    if (areasCountEl) {
      areasCountEl.textContent = allAreas.length;
    }
    if (markersCountEl) {
      markersCountEl.textContent = markers.length;
    }
    if (labelsCountEl) {
      labelsCountEl.textContent = textLabels.length;
    }
    
    // 渲染列表
    if (allAreas.length === 0 && markers.length === 0 && textLabels.length === 0) {
      listContainer.innerHTML = '<p class="empty-state">點擊地圖或使用搜索添加內容</p>';
    } else {
      let html = '';
      
      // 渲染區域
      allAreas.forEach(area => {
        const isSelected = this.selectedType === 'area' && this.selectedAreaId === area.id && this.selectedAreaStage === area.stage;
        html += `
          <div class="content-item ${isSelected ? 'selected' : ''}" 
               data-area-id="${area.id}" 
               data-area-stage="${area.stage}"
               style="border-left-color: ${area.color || '#6CA7A1'}">
            <div class="content-item-info">
              <div class="content-item-color" style="background-color: ${area.color || '#6CA7A1'}"></div>
              <span class="content-item-name">${area.name || area.id}</span>
              <span class="content-item-stage">(${area.stageLabel})</span>
            </div>
            <button class="content-item-remove" 
                    data-type="area"
                    data-area-id="${area.id}"
                    data-area-stage="${area.stage}"
                    title="刪除">
              ✕
            </button>
          </div>
        `;
      });
      
      // 渲染標記
      markers.forEach(marker => {
        const isSelected = this.selectedType === 'marker' && this.selectedMarkerId === marker.id;
        html += `
          <div class="content-item ${isSelected ? 'selected' : ''}" 
               data-marker-id="${marker.id}"
               style="border-left-color: ${marker.color || '#ff0000'}">
            <div class="content-item-info">
              <div class="content-item-color" style="background-color: ${marker.color || '#ff0000'}"></div>
              <span class="content-item-name">📍 ${marker.name || marker.id}</span>
            </div>
            <button class="content-item-remove" 
                    data-type="marker"
                    data-marker-id="${marker.id}"
                    title="刪除">
              ✕
            </button>
          </div>
        `;
      });
      
      // 渲染文字標籤
      textLabels.forEach(label => {
        const isSelected = this.selectedType === 'label' && this.selectedLabelId === label.id;
        html += `
          <div class="content-item ${isSelected ? 'selected' : ''}" 
               data-label-id="${label.id}"
               style="border-left-color: ${label.color || '#333333'}">
            <div class="content-item-info">
              <div class="content-item-color" style="background-color: ${label.color || '#333333'}"></div>
              <span class="content-item-name">📝 ${label.text || label.id}</span>
            </div>
            <button class="content-item-remove" 
                    data-type="label"
                    data-label-id="${label.id}"
                    title="刪除">
              ✕
            </button>
          </div>
        `;
      });
      
      listContainer.innerHTML = html;
      
      // 綁定點擊事件 - 區域
      listContainer.querySelectorAll('.content-item[data-area-id]').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('content-item-remove')) {
            return;
          }
          const areaId = item.dataset.areaId;
          const areaStage = item.dataset.areaStage;
          this.selectArea(areaId, areaStage);
        });
      });
      
      // 綁定點擊事件 - 標記
      listContainer.querySelectorAll('.content-item[data-marker-id]').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('content-item-remove')) {
            return;
          }
          const markerId = item.dataset.markerId;
          this.selectMarker(markerId);
        });
      });
      
      // 綁定點擊事件 - 文字標籤
      listContainer.querySelectorAll('.content-item[data-label-id]').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('content-item-remove')) {
            return;
          }
          const labelId = item.dataset.labelId;
          this.selectTextLabel(labelId);
        });
      });
      
      // 綁定刪除按鈕事件
      listContainer.querySelectorAll('.content-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const type = btn.dataset.type;
          
          if (type === 'area') {
            const areaId = btn.dataset.areaId;
            const areaStage = btn.dataset.areaStage;
            if (areaId && areaStage) {
              this.removeArea(areaId, areaStage);
            }
          } else if (type === 'marker') {
            const markerId = btn.dataset.markerId;
            if (markerId) {
              this.removeMarker(markerId);
            }
          } else if (type === 'label') {
            const labelId = btn.dataset.labelId;
            if (labelId) {
              this.removeTextLabel(labelId);
            }
          }
        });
      });
    }
  }

  /**
   * 選擇區域並顯示樣式面板
   */
  selectArea(areaId, stage) {
    this.selectedAreaId = areaId;
    this.selectedAreaStage = stage;
    this.selectedMarkerId = null;
    this.selectedLabelId = null;
    this.selectedType = 'area';
    
    const state = this.stateManager.getState();
    const stageData = state[stage + 'Stage'];
    const area = stageData?.areas?.find(a => a.id === areaId);
    
    if (!area) {
      this.logger?.warn('Area not found:', areaId, stage);
      return;
    }
    
    // 更新列表以顯示選中狀態
    this.updateContentList();
    
    // 顯示樣式面板
    this.showAreaStylePanel(area, stage);
  }

  /**
   * 選擇標記並顯示樣式面板
   */
  selectMarker(markerId) {
    this.selectedMarkerId = markerId;
    this.selectedAreaId = null;
    this.selectedAreaStage = null;
    this.selectedLabelId = null;
    this.selectedType = 'marker';
    
    const state = this.stateManager.getState();
    const marker = state.annotations?.markers?.find(m => m.id === markerId);
    
    if (!marker) {
      this.logger?.warn('Marker not found:', markerId);
      return;
    }
    
    // 更新列表以顯示選中狀態
    this.updateContentList();
    
    // 顯示樣式面板
    this.showMarkerStylePanel(marker);
  }

  /**
   * 選擇文字標籤並顯示樣式面板
   */
  selectTextLabel(labelId) {
    this.selectedLabelId = labelId;
    this.selectedAreaId = null;
    this.selectedAreaStage = null;
    this.selectedMarkerId = null;
    this.selectedType = 'label';
    
    const state = this.stateManager.getState();
    const label = state.annotations?.textLabels?.find(l => l.id === labelId);
    
    if (!label) {
      this.logger?.warn('Text label not found:', labelId);
      return;
    }
    
    // 更新列表以顯示選中狀態
    this.updateContentList();
    
    // 顯示樣式面板
    this.showLabelStylePanel(label);
  }

  /**
   * 顯示區域樣式面板
   */
  showAreaStylePanel(area, stage) {
    // 隱藏其他樣式面板
    this.hideMarkerStylePanel();
    this.hideLabelStylePanel();
    
    const panel = document.getElementById('area-style-panel');
    const titleEl = document.getElementById('area-style-title');
    const colorInput = document.getElementById('area-style-color');
    const fillBtn = document.getElementById('area-style-fill');
    const outlineBtn = document.getElementById('area-style-outline');
    
    if (!panel) return;
    
    // 設置標題
    if (titleEl) {
      titleEl.textContent = `區域樣式: ${area.name || area.id}`;
    }
    
    // 設置顏色
    if (colorInput) {
      colorInput.value = area.color || '#6CA7A1';
    }
    
    // 設置模式（從階段設置或區域設置）
    const state = this.stateManager.getState();
    const stageData = state[stage + 'Stage'];
    const mode = stageData?.boundaryMode || 'fill';
    
    if (fillBtn && outlineBtn) {
      if (mode === 'fill') {
        fillBtn.classList.add('active');
        outlineBtn.classList.remove('active');
      } else {
        fillBtn.classList.remove('active');
        outlineBtn.classList.add('active');
      }
    }
    
    // 顯示面板
    panel.style.display = 'block';
  }

  /**
   * 隱藏區域樣式面板
   */
  hideAreaStylePanel() {
    const panel = document.getElementById('area-style-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    if (this.selectedType === 'area') {
      this.selectedAreaId = null;
      this.selectedAreaStage = null;
      this.selectedType = null;
      this.updateContentList();
    }
  }

  /**
   * 顯示標記樣式面板
   */
  showMarkerStylePanel(marker) {
    // 隱藏其他樣式面板
    this.hideAreaStylePanel();
    this.hideLabelStylePanel();
    
    const panel = document.getElementById('marker-style-panel');
    const titleEl = document.getElementById('marker-style-title');
    const colorInput = document.getElementById('marker-style-color');
    const typeSelect = document.getElementById('marker-style-type');
    const sizeInput = document.getElementById('marker-style-size');
    const sizeDisplay = document.getElementById('marker-style-size-display');
    
    if (!panel) return;
    
    if (titleEl) {
      titleEl.textContent = `標記樣式: ${marker.name || marker.id}`;
    }
    
    if (colorInput) {
      colorInput.value = marker.color || '#ff0000';
    }
    
    if (typeSelect) {
      typeSelect.value = marker.type || 'point';
    }
    
    if (sizeInput) {
      const size = marker.size || 12;
      sizeInput.value = size;
      if (sizeDisplay) {
        sizeDisplay.textContent = size + 'px';
      }
    }
    
    panel.style.display = 'block';
  }

  /**
   * 隱藏標記樣式面板
   */
  hideMarkerStylePanel() {
    const panel = document.getElementById('marker-style-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    if (this.selectedType === 'marker') {
      this.selectedMarkerId = null;
      this.selectedType = null;
      this.updateContentList();
    }
  }

  /**
   * 顯示文字標籤樣式面板
   */
  showLabelStylePanel(label) {
    // 隱藏其他樣式面板
    this.hideAreaStylePanel();
    this.hideMarkerStylePanel();
    
    const panel = document.getElementById('label-style-panel');
    const titleEl = document.getElementById('label-style-title');
    const textInput = document.getElementById('label-style-text');
    const colorInput = document.getElementById('label-style-color');
    const bgColorInput = document.getElementById('label-style-bg-color');
    const sizeInput = document.getElementById('label-style-size');
    const sizeDisplay = document.getElementById('label-style-size-display');
    
    if (!panel) return;
    
    if (titleEl) {
      titleEl.textContent = `文字樣式: ${label.text || label.id}`;
    }
    
    if (textInput) {
      textInput.value = label.text || '';
    }
    
    if (colorInput) {
      colorInput.value = label.color || '#333333';
    }
    
    if (bgColorInput) {
      bgColorInput.value = label.backgroundColor || '#ffffff';
    }
    
    if (sizeInput) {
      const size = label.fontSize || 14;
      sizeInput.value = size;
      if (sizeDisplay) {
        sizeDisplay.textContent = size + 'px';
      }
    }
    
    panel.style.display = 'block';
  }

  /**
   * 隱藏文字標籤樣式面板
   */
  hideLabelStylePanel() {
    const panel = document.getElementById('label-style-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    if (this.selectedType === 'label') {
      this.selectedLabelId = null;
      this.selectedType = null;
      this.updateContentList();
    }
  }

  /**
   * 初始化樣式面板事件
   */
  initStylePanelEvents() {
    // 顏色選擇器
    const colorInput = document.getElementById('area-style-color');
    if (colorInput) {
      colorInput.addEventListener('change', (e) => {
        if (this.selectedAreaId && this.selectedAreaStage) {
          this.updateAreaColor(this.selectedAreaId, this.selectedAreaStage, e.target.value);
        }
      });
    }
    
    // 色票按鈕
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        if (color && this.selectedAreaId && this.selectedAreaStage) {
          const colorInput = document.getElementById('area-style-color');
          if (colorInput) {
            colorInput.value = color;
            this.updateAreaColor(this.selectedAreaId, this.selectedAreaStage, color);
            // 更新色票選中狀態
            document.querySelectorAll('.color-preset').forEach(p => {
              if (p.dataset.color === color) {
                p.classList.add('active');
              } else {
                p.classList.remove('active');
              }
            });
          }
        }
      });
    });
    
    // 填充/輪廓切換
    const fillBtn = document.getElementById('area-style-fill');
    const outlineBtn = document.getElementById('area-style-outline');
    
    if (fillBtn) {
      fillBtn.addEventListener('click', () => {
        if (this.selectedAreaId && this.selectedAreaStage) {
          this.updateAreaMode(this.selectedAreaId, this.selectedAreaStage, 'fill');
        }
      });
    }
    
    if (outlineBtn) {
      outlineBtn.addEventListener('click', () => {
        if (this.selectedAreaId && this.selectedAreaStage) {
          this.updateAreaMode(this.selectedAreaId, this.selectedAreaStage, 'outline');
        }
      });
    }
    
    // 關閉按鈕
    const closeBtn = document.getElementById('area-style-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideAreaStylePanel();
      });
    }
    
    // 初始化標記樣式面板事件
    this.initMarkerStylePanelEvents();
    
    // 初始化文字標籤樣式面板事件
    this.initLabelStylePanelEvents();
  }

  /**
   * 更新區域顏色
   */
  updateAreaColor(areaId, stage, color) {
    const state = this.stateManager.getState();
    const stageData = state[stage + 'Stage'];
    const areaIndex = stageData?.areas?.findIndex(a => a.id === areaId);
    
    if (areaIndex === undefined || areaIndex < 0) {
      this.logger?.warn('Area not found for color update:', areaId, stage);
      return;
    }
    
    // 更新狀態
    const newState = {
      ...state,
      [stage + 'Stage']: {
        ...stageData,
        areas: stageData.areas.map((a, i) => 
          i === areaIndex ? { ...a, color } : a
        )
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    // 更新地圖上的樣式
    if (this.boundaryManager) {
      this.boundaryManager.updateAreaStyle(stage, areaId, {
        color: color,
        opacity: stageData.areas[areaIndex].opacity || 0.7
      });
    }
    
    // 更新列表
    this.updateContentList();
    
    // 更新樣式面板
    const area = newState[stage + 'Stage'].areas[areaIndex];
    this.showAreaStylePanel(area, stage);
    
    if (this.eventBus) {
      this.eventBus.emit('area:style:updated', { stage, areaId, color });
    }
  }

  /**
   * 更新區域模式（填充/輪廓）
   */
  updateAreaMode(areaId, stage, mode) {
    const state = this.stateManager.getState();
    const stageData = state[stage + 'Stage'];
    
    // 更新階段模式（影響所有區域）
    const newState = {
      ...state,
      [stage + 'Stage']: {
        ...stageData,
        boundaryMode: mode
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    // 更新地圖上的模式
    if (this.boundaryManager) {
      this.boundaryManager.setMode(stage, mode);
    }
    
    // 更新樣式面板按鈕狀態
    const fillBtn = document.getElementById('area-style-fill');
    const outlineBtn = document.getElementById('area-style-outline');
    
    if (fillBtn && outlineBtn) {
      if (mode === 'fill') {
        fillBtn.classList.add('active');
        outlineBtn.classList.remove('active');
      } else {
        fillBtn.classList.remove('active');
        outlineBtn.classList.add('active');
      }
    }
    
    if (this.eventBus) {
      this.eventBus.emit('area:mode:updated', { stage, mode });
    }
  }

  /**
   * 刪除區域
   */
  removeArea(areaId, stage) {
    if (this.logger) {
      this.logger.info('Removing area:', areaId, stage);
    }
    
    // 從地圖上移除邊界
    if (this.boundaryManager) {
      this.boundaryManager.removeArea(stage, areaId);
    }
    
    // 使用 StageController 刪除區域
    if (typeof window !== 'undefined' && window.stageController) {
      window.stageController.removeArea(stage, areaId);
    }
    
    // 隱藏樣式面板
    this.hideAreaStylePanel();
  }

  /**
   * 初始化標記樣式面板事件
   */
  initMarkerStylePanelEvents() {
    // 顏色選擇器
    const colorInput = document.getElementById('marker-style-color');
    if (colorInput) {
      colorInput.addEventListener('change', (e) => {
        if (this.selectedMarkerId) {
          this.updateMarkerColor(this.selectedMarkerId, e.target.value);
        }
      });
    }
    
    // 類型選擇
    const typeSelect = document.getElementById('marker-style-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        if (this.selectedMarkerId) {
          this.updateMarkerType(this.selectedMarkerId, e.target.value);
        }
      });
    }
    
    // 大小滑塊
    const sizeInput = document.getElementById('marker-style-size');
    const sizeDisplay = document.getElementById('marker-style-size-display');
    if (sizeInput && sizeDisplay) {
      sizeInput.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        sizeDisplay.textContent = size + 'px';
        if (this.selectedMarkerId) {
          this.updateMarkerSize(this.selectedMarkerId, size);
        }
      });
    }
    
    // 關閉按鈕
    const closeBtn = document.getElementById('marker-style-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideMarkerStylePanel();
      });
    }
  }

  /**
   * 初始化文字標籤樣式面板事件
   */
  initLabelStylePanelEvents() {
    // 文字輸入
    const textInput = document.getElementById('label-style-text');
    if (textInput) {
      textInput.addEventListener('change', (e) => {
        if (this.selectedLabelId) {
          this.updateLabelText(this.selectedLabelId, e.target.value);
        }
      });
    }
    
    // 顏色選擇器
    const colorInput = document.getElementById('label-style-color');
    if (colorInput) {
      colorInput.addEventListener('change', (e) => {
        if (this.selectedLabelId) {
          this.updateLabelColor(this.selectedLabelId, e.target.value);
        }
      });
    }
    
    // 背景顏色選擇器
    const bgColorInput = document.getElementById('label-style-bg-color');
    if (bgColorInput) {
      bgColorInput.addEventListener('change', (e) => {
        if (this.selectedLabelId) {
          this.updateLabelBgColor(this.selectedLabelId, e.target.value);
        }
      });
    }
    
    // 大小滑塊
    const sizeInput = document.getElementById('label-style-size');
    const sizeDisplay = document.getElementById('label-style-size-display');
    if (sizeInput && sizeDisplay) {
      sizeInput.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        sizeDisplay.textContent = size + 'px';
        if (this.selectedLabelId) {
          this.updateLabelSize(this.selectedLabelId, size);
        }
      });
    }
    
    // 關閉按鈕
    const closeBtn = document.getElementById('label-style-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideLabelStylePanel();
      });
    }
  }

  /**
   * 更新標記顏色
   */
  updateMarkerColor(markerId, color) {
    const state = this.stateManager.getState();
    const markerIndex = state.annotations?.markers?.findIndex(m => m.id === markerId);
    
    if (markerIndex === undefined || markerIndex < 0) {
      this.logger?.warn('Marker not found for color update:', markerId);
      return;
    }
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        markers: state.annotations.markers.map((m, i) => 
          i === markerIndex ? { ...m, color } : m
        )
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    // 更新地圖上的樣式
    if (this.markerManager) {
      this.markerManager.updateMarkerStyle(markerId, { color });
    }
    
    this.updateContentList();
    const marker = newState.annotations.markers[markerIndex];
    this.showMarkerStylePanel(marker);
    
    if (this.eventBus) {
      this.eventBus.emit('marker:style:updated', { markerId, color });
    }
  }

  /**
   * 更新標記類型
   */
  updateMarkerType(markerId, type) {
    const state = this.stateManager.getState();
    const markerIndex = state.annotations?.markers?.findIndex(m => m.id === markerId);
    
    if (markerIndex === undefined || markerIndex < 0) {
      return;
    }
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        markers: state.annotations.markers.map((m, i) => 
          i === markerIndex ? { ...m, type } : m
        )
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.markerManager) {
      this.markerManager.updateMarkerStyle(markerId, { type });
    }
    
    this.updateContentList();
    const marker = newState.annotations.markers[markerIndex];
    this.showMarkerStylePanel(marker);
  }

  /**
   * 更新標記大小
   */
  updateMarkerSize(markerId, size) {
    const state = this.stateManager.getState();
    const markerIndex = state.annotations?.markers?.findIndex(m => m.id === markerId);
    
    if (markerIndex === undefined || markerIndex < 0) {
      return;
    }
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        markers: state.annotations.markers.map((m, i) => 
          i === markerIndex ? { ...m, size } : m
        )
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.markerManager) {
      this.markerManager.updateMarkerStyle(markerId, { size });
    }
    
    this.updateContentList();
    const marker = newState.annotations.markers[markerIndex];
    this.showMarkerStylePanel(marker);
  }

  /**
   * 更新文字標籤文字
   */
  updateLabelText(labelId, text) {
    const state = this.stateManager.getState();
    const labelIndex = state.annotations?.textLabels?.findIndex(l => l.id === labelId);
    
    if (labelIndex === undefined || labelIndex < 0) {
      return;
    }
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        textLabels: state.annotations.textLabels.map((l, i) => 
          i === labelIndex ? { ...l, text } : l
        )
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.labelManager) {
      this.labelManager.updateLabelText(labelId, text);
    }
    
    this.updateContentList();
    const label = newState.annotations.textLabels[labelIndex];
    this.showLabelStylePanel(label);
  }

  /**
   * 更新文字標籤顏色
   */
  updateLabelColor(labelId, color) {
    const state = this.stateManager.getState();
    const labelIndex = state.annotations?.textLabels?.findIndex(l => l.id === labelId);
    
    if (labelIndex === undefined || labelIndex < 0) {
      return;
    }
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        textLabels: state.annotations.textLabels.map((l, i) => 
          i === labelIndex ? { ...l, color } : l
        )
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.labelManager) {
      this.labelManager.updateLabelStyle(labelId, { color });
    }
    
    this.updateContentList();
    const label = newState.annotations.textLabels[labelIndex];
    this.showLabelStylePanel(label);
  }

  /**
   * 更新文字標籤背景顏色
   */
  updateLabelBgColor(labelId, backgroundColor) {
    const state = this.stateManager.getState();
    const labelIndex = state.annotations?.textLabels?.findIndex(l => l.id === labelId);
    
    if (labelIndex === undefined || labelIndex < 0) {
      return;
    }
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        textLabels: state.annotations.textLabels.map((l, i) => 
          i === labelIndex ? { ...l, backgroundColor } : l
        )
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.labelManager) {
      this.labelManager.updateLabelStyle(labelId, { backgroundColor });
    }
    
    this.updateContentList();
    const label = newState.annotations.textLabels[labelIndex];
    this.showLabelStylePanel(label);
  }

  /**
   * 更新文字標籤大小
   */
  updateLabelSize(labelId, fontSize) {
    const state = this.stateManager.getState();
    const labelIndex = state.annotations?.textLabels?.findIndex(l => l.id === labelId);
    
    if (labelIndex === undefined || labelIndex < 0) {
      return;
    }
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        textLabels: state.annotations.textLabels.map((l, i) => 
          i === labelIndex ? { ...l, fontSize } : l
        )
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.labelManager) {
      this.labelManager.updateLabelStyle(labelId, { fontSize });
    }
    
    this.updateContentList();
    const label = newState.annotations.textLabels[labelIndex];
    this.showLabelStylePanel(label);
  }

  /**
   * 刪除標記
   */
  removeMarker(markerId) {
    if (this.logger) {
      this.logger.info('Removing marker:', markerId);
    }
    
    // 從地圖上移除標記
    if (this.markerManager) {
      this.markerManager.removeMarker(markerId);
    }
    
    // 使用 StageController 刪除標記
    if (typeof window !== 'undefined' && window.stageController) {
      window.stageController.removeMarker(markerId);
    }
    
    // 隱藏樣式面板
    this.hideMarkerStylePanel();
  }

  /**
   * 刪除文字標籤
   */
  removeTextLabel(labelId) {
    if (this.logger) {
      this.logger.info('Removing text label:', labelId);
    }
    
    // 從地圖上移除標籤
    if (this.labelManager) {
      this.labelManager.removeLabel(labelId);
    }
    
    // 使用 StageController 刪除文字標籤
    if (typeof window !== 'undefined' && window.stageController) {
      window.stageController.removeTextLabel(labelId);
    }
    
    // 隱藏樣式面板
    this.hideLabelStylePanel();
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentListManager;
} else if (typeof window !== 'undefined') {
  window.ContentListManager = ContentListManager;
}

