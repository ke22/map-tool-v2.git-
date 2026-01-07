/**
 * EventBus - 事件总线
 * 
 * 提供事件发布/订阅机制，用于模块间通信
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   * @returns {Function} 取消订阅函数
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  /**
   * 订阅事件（只触发一次）
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   * @returns {Function} 取消订阅函数
   */
  once(event, handler) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, []);
    }
    this.onceListeners.get(event).push(handler);

    // 返回取消订阅函数
    return () => {
      const handlers = this.onceListeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数（可选，不提供则取消该事件的所有订阅）
   */
  off(event, handler) {
    if (!handler) {
      // 取消该事件的所有订阅
      this.listeners.delete(event);
      this.onceListeners.delete(event);
      return;
    }

    // 取消指定的订阅
    const handlers = this.listeners.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }

    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      const index = onceHandlers.indexOf(handler);
      if (index > -1) {
        onceHandlers.splice(index, 1);
      }
    }
  }

  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    // 触发普通订阅
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }

    // 触发一次性订阅
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers && onceHandlers.length > 0) {
      // 复制数组并清空原数组
      const handlersToCall = [...onceHandlers];
      this.onceListeners.set(event, []);

      handlersToCall.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in once event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 移除所有事件监听器
   */
  removeAllListeners() {
    this.listeners.clear();
    this.onceListeners.clear();
  }

  /**
   * 获取指定事件的监听器数量
   * @param {string} event - 事件名称
   * @returns {number} 监听器数量
   */
  listenerCount(event) {
    const handlers = this.listeners.get(event) || [];
    const onceHandlers = this.onceListeners.get(event) || [];
    return handlers.length + onceHandlers.length;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventBus;
}



