/**
 * StageController - 阶段控制器
 * 
 * 处理阶段相关的业务逻辑，整合工作流逻辑和 UI
 */

class StageController {
  constructor(stageManager, stateManager, eventBus = null) {
    this.stageManager = stageManager;
    this.stateManager = stateManager;
    this.eventBus = eventBus;
  }

  /**
   * 添加区域到指定阶段
   * @param {string} stage - 阶段名称
   * @param {Object} area - 区域对象
   */
  addArea(stage, area) {
    if (stage === 'export') {
      throw new Error('Cannot add area to export stage');
    }
    
    const state = this.stateManager.getState();
    const stageData = state[stage + 'Stage'];
    
    if (!stageData) {
      throw new Error(`Invalid stage: ${stage}`);
    }
    
    // 添加区域
    const newState = {
      ...state,
      [stage + 'Stage']: {
        ...stageData,
        areas: [...stageData.areas, area]
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('area:added', { stage, area });
    }
  }

  /**
   * 从指定阶段移除区域
   * @param {string} stage - 阶段名称
   * @param {string} areaId - 区域 ID
   */
  removeArea(stage, areaId) {
    if (stage === 'export') {
      throw new Error('Cannot remove area from export stage');
    }
    
    const state = this.stateManager.getState();
    const stageData = state[stage + 'Stage'];
    
    if (!stageData) {
      throw new Error(`Invalid stage: ${stage}`);
    }
    
    // 移除区域
    const newState = {
      ...state,
      [stage + 'Stage']: {
        ...stageData,
        areas: stageData.areas.filter(area => area.id !== areaId)
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('area:removed', { stage, areaId });
    }
  }

  /**
   * 更新阶段边界线设置
   * @param {string} stage - 阶段名称
   * @param {Object} settings - 边界线设置
   */
  updateBoundarySettings(stage, settings) {
    if (stage === 'export') {
      throw new Error('Cannot update boundary settings for export stage');
    }
    
    const state = this.stateManager.getState();
    const stageData = state[stage + 'Stage'];
    
    if (!stageData) {
      throw new Error(`Invalid stage: ${stage}`);
    }
    
    const newState = {
      ...state,
      [stage + 'Stage']: {
        ...stageData,
        ...settings
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('boundary:updated', { stage, settings });
    }
  }

  /**
   * 添加标记
   * @param {Object} marker - 标记对象
   */
  addMarker(marker) {
    const state = this.stateManager.getState();
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        markers: [...state.annotations.markers, marker]
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('marker:added', { marker });
    }
  }

  /**
   * 移除标记
   * @param {string} markerId - 标记 ID
   */
  removeMarker(markerId) {
    const state = this.stateManager.getState();
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        markers: state.annotations.markers.filter(m => m.id !== markerId)
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('marker:removed', { markerId });
    }
  }

  /**
   * 添加文字标签
   * @param {Object} textLabel - 文字标签对象
   */
  addTextLabel(textLabel) {
    const state = this.stateManager.getState();
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        textLabels: [...state.annotations.textLabels, textLabel]
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('textLabel:added', { textLabel });
    }
  }

  /**
   * 移除文字标签
   * @param {string} labelId - 标签 ID
   */
  removeTextLabel(labelId) {
    const state = this.stateManager.getState();
    
    const newState = {
      ...state,
      annotations: {
        ...state.annotations,
        textLabels: state.annotations.textLabels.filter(l => l.id !== labelId)
      },
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString()
      }
    };
    
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('textLabel:removed', { labelId });
    }
  }

  /**
   * 完成当前阶段
   */
  completeCurrentStage() {
    const currentStage = this.stageManager.getCurrentStage();
    this.stageManager.markStageCompleted(currentStage);
    
    // 自动切换到下一阶段
    const nextStage = this.stageManager.getNextStage(currentStage);
    if (nextStage) {
      this.stageManager.switchStage(nextStage);
    }
  }

  /**
   * 跳过当前阶段
   */
  skipCurrentStage() {
    const currentStage = this.stageManager.getCurrentStage();
    this.stageManager.skipStage(currentStage);
    
    // 自动切换到下一阶段
    const nextStage = this.stageManager.getNextStage(currentStage);
    if (nextStage) {
      this.stageManager.switchStage(nextStage);
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StageController;
}




