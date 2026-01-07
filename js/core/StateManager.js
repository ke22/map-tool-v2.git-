/**
 * StateManager - 状态管理器
 * 
 * 管理应用状态，提供状态更新和订阅机制
 */

class StateManager {
  constructor(initialState = {}, eventBus = null) {
    this.state = initialState;
    this.eventBus = eventBus;
    this.subscribers = new Set();
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;
    this.historyEnabled = true;
  }

  /**
   * 获取当前状态
   * @returns {*} 当前状态
   */
  getState() {
    return this.state;
  }

  /**
   * 更新状态
   * @param {*} newState - 新状态（可以是部分状态或完整状态）
   * @param {Object} options - 选项
   * @param {boolean} options.silent - 是否静默更新（不触发事件）
   * @param {boolean} options.addToHistory - 是否添加到历史记录
   */
  updateState(newState, options = {}) {
    const previousState = JSON.parse(JSON.stringify(this.state));
    
    // 合并状态
    if (typeof newState === 'function') {
      this.state = newState(this.state);
    } else {
      this.state = this.mergeState(this.state, newState);
    }

    // 添加到历史记录
    if (this.historyEnabled && options.addToHistory !== false) {
      this.addToHistory(previousState);
    }

    // 触发更新事件
    if (!options.silent) {
      this.notifySubscribers(previousState, this.state);
    }
  }

  /**
   * 合并状态
   * @private
   * @param {*} currentState - 当前状态
   * @param {*} newState - 新状态
   * @returns {*} 合并后的状态
   */
  mergeState(currentState, newState) {
    if (typeof currentState !== 'object' || currentState === null) {
      return newState;
    }
    if (typeof newState !== 'object' || newState === null) {
      return newState;
    }

    // 深度合并
    const merged = { ...currentState };
    for (const key in newState) {
      if (Object.prototype.hasOwnProperty.call(newState, key)) {
        if (
          typeof newState[key] === 'object' &&
          newState[key] !== null &&
          !Array.isArray(newState[key]) &&
          typeof currentState[key] === 'object' &&
          currentState[key] !== null &&
          !Array.isArray(currentState[key])
        ) {
          merged[key] = this.mergeState(currentState[key], newState[key]);
        } else {
          merged[key] = newState[key];
        }
      }
    }
    return merged;
  }

  /**
   * 订阅状态更新
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * 通知订阅者
   * @private
   * @param {*} previousState - 之前的状态
   * @param {*} currentState - 当前状态
   */
  notifySubscribers(previousState, currentState) {
    this.subscribers.forEach(callback => {
      try {
        callback(currentState, previousState);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });

    // 通过 EventBus 发布事件
    if (this.eventBus) {
      this.eventBus.emit('state:update', {
        state: currentState,
        previousState
      });
    }
  }

  /**
   * 添加到历史记录
   * @private
   * @param {*} state - 状态快照
   */
  addToHistory(state) {
    // 移除当前位置之后的历史记录（如果存在）
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // 添加新状态
    this.history.push(JSON.parse(JSON.stringify(state)));
    this.historyIndex = this.history.length - 1;

    // 限制历史记录长度
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * 撤销
   * @returns {boolean} 是否成功撤销
   */
  undo() {
    if (!this.historyEnabled || this.historyIndex <= 0) {
      return false;
    }

    this.historyIndex--;
    const previousState = this.history[this.historyIndex];
    this.state = JSON.parse(JSON.stringify(previousState));
    this.notifySubscribers(this.state, previousState);

    return true;
  }

  /**
   * 重做
   * @returns {boolean} 是否成功重做
   */
  redo() {
    if (!this.historyEnabled || this.historyIndex >= this.history.length - 1) {
      return false;
    }

    this.historyIndex++;
    const nextState = this.history[this.historyIndex];
    const previousState = this.state;
    this.state = JSON.parse(JSON.stringify(nextState));
    this.notifySubscribers(previousState, this.state);

    return true;
  }

  /**
   * 重置状态
   * @param {*} newState - 新状态
   */
  resetState(newState) {
    const previousState = this.state;
    this.state = JSON.parse(JSON.stringify(newState));
    this.history = [];
    this.historyIndex = -1;
    this.notifySubscribers(previousState, this.state);
  }

  /**
   * 启用/禁用历史记录
   * @param {boolean} enabled - 是否启用
   */
  setHistoryEnabled(enabled) {
    this.historyEnabled = enabled;
    if (!enabled) {
      this.history = [];
      this.historyIndex = -1;
    }
  }

  /**
   * 序列化状态
   * @returns {string} 序列化后的状态字符串
   */
  serialize() {
    return JSON.stringify(this.state);
  }

  /**
   * 反序列化状态
   * @param {string} serialized - 序列化后的状态字符串
   */
  deserialize(serialized) {
    try {
      const newState = JSON.parse(serialized);
      this.resetState(newState);
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      throw error;
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
}



