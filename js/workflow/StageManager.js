/**
 * StageManager - 阶段管理器
 * 
 * 管理工作流阶段的切换和状态
 */

class StageManager {
  constructor(stateManager, eventBus = null, config = {}) {
    this.stateManager = stateManager;
    this.eventBus = eventBus;
    
    const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
    this.workflowConfig = CONFIG.WORKFLOW || {};
    this.allowStageSkip = config.allowStageSkip !== undefined 
      ? config.allowStageSkip 
      : (this.workflowConfig.ALLOW_STAGE_SKIP !== false);
    this.allowStageNavigation = config.allowStageNavigation !== undefined
      ? config.allowStageNavigation
      : (this.workflowConfig.ALLOW_STAGE_NAVIGATION !== false);
    
    // 阶段顺序
    this.stageOrder = ['country', 'administration', 'export'];
  }

  /**
   * 获取当前阶段
   * @returns {string} 当前阶段名称
   */
  getCurrentStage() {
    const state = this.stateManager.getState();
    return state.currentStage;
  }

  /**
   * 切换阶段
   * @param {string} targetStage - 目标阶段
   * @throws {Error} 如果切换不合法
   */
  switchStage(targetStage) {
    const currentStage = this.getCurrentStage();
    
    // 验证切换合法性
    if (!this.canSwitch(currentStage, targetStage)) {
      throw new Error(`Cannot switch from ${currentStage} to ${targetStage}`);
    }
    
    const state = this.stateManager.getState();
    
    // 如果正向切换，标记当前阶段为完成
    if (this.isForwardSwitch(currentStage, targetStage)) {
      const currentStageData = this.getStageData(currentStage);
      if (currentStageData && currentStageData.status === 'active') {
        this.markStageCompleted(currentStage);
      }
    }
    
    // 切换阶段（使用全局或 require）
    const WorkflowState = typeof window !== 'undefined' ? window.WorkflowState : require('./WorkflowState');
    const newState = WorkflowState.switchStage(state, targetStage);
    this.stateManager.updateState(newState);
    
    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('stage:switch', {
        from: currentStage,
        to: targetStage
      });
    }
  }

  /**
   * 检查是否可以切换阶段
   * @param {string} from - 源阶段
   * @param {string} to - 目标阶段
   * @returns {boolean} 是否可以切换
   */
  canSwitch(from, to) {
    // 正向切换规则
    const forwardRules = {
      'country': ['administration', 'export'],
      'administration': ['export'],
      'export': []
    };
    
    // 反向切换规则（如果允许）
    if (this.allowStageNavigation) {
      const backwardRules = {
        'export': ['administration', 'country'],
        'administration': ['country'],
        'country': []
      };
      
      return forwardRules[from]?.includes(to) || 
             backwardRules[from]?.includes(to) || 
             false;
    }
    
    return forwardRules[from]?.includes(to) || false;
  }

  /**
   * 判断是否是正向切换
   * @private
   * @param {string} from - 源阶段
   * @param {string} to - 目标阶段
   * @returns {boolean} 是否是正向切换
   */
  isForwardSwitch(from, to) {
    const fromIndex = this.stageOrder.indexOf(from);
    const toIndex = this.stageOrder.indexOf(to);
    return toIndex > fromIndex;
  }

  /**
   * 标记阶段为完成
   * @param {string} stage - 阶段名称
   */
  markStageCompleted(stage) {
    if (stage === 'export') {
      return;
    }
    
    const state = this.stateManager.getState();
    const WorkflowState = typeof window !== 'undefined' ? window.WorkflowState : require('./WorkflowState');
    const newState = WorkflowState.setStageStatus(state, stage, 'completed');
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('stage:completed', { stage });
    }
  }

  /**
   * 跳过阶段
   * @param {string} stage - 阶段名称
   * @throws {Error} 如果不允许跳过
   */
  skipStage(stage) {
    if (!this.allowStageSkip) {
      throw new Error('Stage skipping is not allowed');
    }
    
    if (stage === 'export') {
      throw new Error('Cannot skip export stage');
    }
    
    const state = this.stateManager.getState();
    const WorkflowState = typeof window !== 'undefined' ? window.WorkflowState : require('./WorkflowState');
    const newState = WorkflowState.setStageStatus(state, stage, 'skipped');
    this.stateManager.updateState(newState);
    
    if (this.eventBus) {
      this.eventBus.emit('stage:skipped', { stage });
    }
  }

  /**
   * 获取阶段数据
   * @param {string} stage - 阶段名称
   * @returns {Object|null} 阶段数据
   */
  getStageData(stage) {
    const state = this.stateManager.getState();
    const WorkflowState = typeof window !== 'undefined' ? window.WorkflowState : require('./WorkflowState');
    return WorkflowState.getStageData(state, stage);
  }

  /**
   * 获取下一个阶段
   * @param {string} stage - 当前阶段
   * @returns {string|null} 下一个阶段
   */
  getNextStage(stage) {
    const index = this.stageOrder.indexOf(stage);
    if (index < 0 || index >= this.stageOrder.length - 1) {
      return null;
    }
    return this.stageOrder[index + 1];
  }

  /**
   * 获取上一个阶段
   * @param {string} stage - 当前阶段
   * @returns {string|null} 上一个阶段
   */
  getPreviousStage(stage) {
    const index = this.stageOrder.indexOf(stage);
    if (index <= 0) {
      return null;
    }
    return this.stageOrder[index - 1];
  }

  /**
   * 导航到指定阶段（回溯编辑）
   * @param {string} targetStage - 目标阶段
   * @throws {Error} 如果不允许导航或导航不合法
   */
  navigateToStage(targetStage) {
    if (!this.allowStageNavigation) {
      throw new Error('Stage navigation is not allowed');
    }
    
    const currentStage = this.getCurrentStage();
    
    if (!this.canNavigateTo(currentStage, targetStage)) {
      throw new Error(`Cannot navigate from ${currentStage} to ${targetStage}`);
    }
    
    const state = this.stateManager.getState();
    const WorkflowState = typeof window !== 'undefined' ? window.WorkflowState : require('./WorkflowState');
    
    // 激活目标阶段
    const targetStageData = WorkflowState.getStageData(state, targetStage);
    if (targetStageData && 
        (targetStageData.status === 'completed' || targetStageData.status === 'skipped')) {
      const newState = WorkflowState.setStageStatus(state, targetStage, 'active');
      this.stateManager.updateState(newState);
    }
    
    // 切换当前阶段
    const currentState = this.stateManager.getState();
    const finalState = WorkflowState.switchStage(currentState, targetStage);
    this.stateManager.updateState(finalState);
    
    if (this.eventBus) {
      this.eventBus.emit('stage:navigate', {
        from: currentStage,
        to: targetStage
      });
    }
  }

  /**
   * 检查是否可以导航到指定阶段
   * @private
   * @param {string} from - 源阶段
   * @param {string} to - 目标阶段
   * @returns {boolean} 是否可以导航
   */
  canNavigateTo(from, to) {
    // 只能回溯到之前的阶段
    const fromIndex = this.stageOrder.indexOf(from);
    const toIndex = this.stageOrder.indexOf(to);
    return toIndex < fromIndex;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StageManager;
}

