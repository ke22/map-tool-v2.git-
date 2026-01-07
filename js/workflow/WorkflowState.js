/**
 * WorkflowState - 工作流状态定义和管理
 * 
 * 定义和管理三阶段工作流的状态结构
 */

const STAGES = {
  COUNTRY: 'country',
  ADMINISTRATION: 'administration',
  EXPORT: 'export'
};

const STAGE_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  SKIPPED: 'skipped'
};

/**
 * 创建初始工作流状态
 * @param {Object} config - 配置对象
 * @returns {Object} 初始工作流状态
 */
function createInitialState(config = {}) {
  const CONFIG = (typeof window !== 'undefined' && window.CONFIG) ? window.CONFIG : {};
  const workflowConfig = (CONFIG && CONFIG.WORKFLOW) ? CONFIG.WORKFLOW : {};
  
  const defaultStage = config.defaultStage || workflowConfig.DEFAULT_STAGE || STAGES.COUNTRY;
  
  return {
    currentStage: defaultStage,
    
    countryStage: {
      status: defaultStage === STAGES.COUNTRY ? STAGE_STATUS.ACTIVE : STAGE_STATUS.PENDING,
      areas: [],
      boundaryVisible: true,
      boundaryMode: 'fill',
      boundaryColor: '#3388ff',
      boundaryOpacity: 0.5
    },
    
    administrationStage: {
      status: STAGE_STATUS.PENDING,
      areas: [],
      boundaryVisible: true,
      boundaryMode: 'fill',
      boundaryColor: '#ff8800',
      boundaryOpacity: 0.5
    },
    
    annotations: {
      markers: [],
      textLabels: []
    },
    
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '2.0.0'
    }
  };
}

/**
 * 获取当前阶段
 * @param {Object} state - 工作流状态
 * @returns {string} 当前阶段名称
 */
function getCurrentStage(state) {
  return state.currentStage;
}

/**
 * 获取指定阶段的数据
 * @param {Object} state - 工作流状态
 * @param {string} stage - 阶段名称
 * @returns {Object} 阶段数据
 */
function getStageData(state, stage) {
  if (stage === STAGES.EXPORT) {
    // 导出阶段没有独立的数据结构
    return null;
  }
  return state[stage + 'Stage'];
}

/**
 * 设置阶段状态
 * @param {Object} state - 工作流状态
 * @param {string} stage - 阶段名称
 * @param {string} status - 状态值
 * @returns {Object} 新的工作流状态
 */
function setStageStatus(state, stage, status) {
  if (stage === STAGES.EXPORT) {
    return state;
  }
  
  const newState = { ...state };
  newState[stage + 'Stage'] = {
    ...newState[stage + 'Stage'],
    status
  };
  newState.metadata = {
    ...newState.metadata,
    updatedAt: new Date().toISOString()
  };
  
  return newState;
}

/**
 * 切换当前阶段
 * @param {Object} state - 工作流状态
 * @param {string} targetStage - 目标阶段
 * @returns {Object} 新的工作流状态
 */
function switchStage(state, targetStage) {
  if (!Object.values(STAGES).includes(targetStage)) {
    throw new Error(`Invalid stage: ${targetStage}`);
  }
  
  const newState = { ...state };
  newState.currentStage = targetStage;
  
  // 激活目标阶段
  if (targetStage !== STAGES.EXPORT) {
    newState[targetStage + 'Stage'] = {
      ...newState[targetStage + 'Stage'],
      status: STAGE_STATUS.ACTIVE
    };
  }
  
  newState.metadata = {
    ...newState.metadata,
    updatedAt: new Date().toISOString()
  };
  
  return newState;
}

/**
 * 验证工作流状态
 * @param {Object} state - 工作流状态
 * @returns {Object} 验证结果 { valid: boolean, errors: Array }
 */
function validateState(state) {
  const errors = [];
  
  // 检查必需字段
  if (!state.currentStage) {
    errors.push('currentStage is required');
  }
  
  if (!Object.values(STAGES).includes(state.currentStage)) {
    errors.push(`Invalid currentStage: ${state.currentStage}`);
  }
  
  // 检查阶段数据
  [STAGES.COUNTRY, STAGES.ADMINISTRATION].forEach(stage => {
    const stageData = state[stage + 'Stage'];
    if (!stageData) {
      errors.push(`${stage}Stage is required`);
      return;
    }
    
    if (!Object.values(STAGE_STATUS).includes(stageData.status)) {
      errors.push(`Invalid status for ${stage}Stage: ${stageData.status}`);
    }
    
    if (!Array.isArray(stageData.areas)) {
      errors.push(`${stage}Stage.areas must be an array`);
    }
  });
  
  // 检查标注数据
  if (!state.annotations) {
    errors.push('annotations is required');
  } else {
    if (!Array.isArray(state.annotations.markers)) {
      errors.push('annotations.markers must be an array');
    }
    if (!Array.isArray(state.annotations.textLabels)) {
      errors.push('annotations.textLabels must be an array');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 序列化工作流状态（压缩）
 * @param {Object} state - 工作流状态
 * @returns {string} 序列化后的字符串
 */
function serialize(state) {
  // 简单的 JSON 序列化（未来可以添加压缩逻辑）
  return JSON.stringify(state);
}

/**
 * 反序列化工作流状态
 * @param {string} serialized - 序列化后的字符串
 * @returns {Object} 工作流状态
 */
function deserialize(serialized) {
  try {
    const state = JSON.parse(serialized);
    // 验证反序列化的状态
    const validation = validateState(state);
    if (!validation.valid) {
      throw new Error(`Invalid state: ${validation.errors.join(', ')}`);
    }
    return state;
  } catch (error) {
    console.error('Failed to deserialize workflow state:', error);
    throw error;
  }
}

// 导出
const WorkflowState = {
  STAGES,
  STAGE_STATUS,
  createInitialState,
  getCurrentStage,
  getStageData,
  setStageStatus,
  switchStage,
  validateState,
  serialize,
  deserialize
};

// 浏览器环境
if (typeof window !== 'undefined') {
  window.WorkflowState = WorkflowState;
}

// Node.js 环境
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WorkflowState;
}

