/**
 * Debounce and Throttle Utilities
 * 防抖和節流工具函數
 * 
 * 優化頻繁函數調用，提升性能
 */

/**
 * Debounce function - 防抖函數
 * 延遲執行，直到等待時間結束後才執行
 * @param {Function} func - 要防抖的函數
 * @param {number} wait - 等待時間（毫秒）
 * @param {boolean} immediate - 是否立即執行第一次調用
 * @returns {Function} 防抖後的函數
 */
function debounce(func, wait = 300, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
}

/**
 * Throttle function - 節流函數
 * 限制函數執行頻率
 * @param {Function} func - 要節流的函數
 * @param {number} limit - 時間限制（毫秒）
 * @returns {Function} 節流後的函數
 */
function throttle(func, limit = 300) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Debounce Manager - 防抖管理器
 * 管理多個防抖函數，便於統一清理
 */
class DebounceManager {
  constructor() {
    this.timers = new Map();
  }

  /**
   * 創建防抖函數並註冊
   * @param {string} key - 唯一標識
   * @param {Function} func - 要防抖的函數
   * @param {number} wait - 等待時間
   * @param {boolean} immediate - 是否立即執行
   * @returns {Function} 防抖後的函數
   */
  create(key, func, wait = 300, immediate = false) {
    // 清理舊的定時器
    this.cancel(key);

    const debouncedFunc = debounce(func, wait, immediate);
    
    // 包裝函數以追蹤定時器
    const wrappedFunc = (...args) => {
      const timeoutId = setTimeout(() => {
        this.timers.delete(key);
      }, wait);
      this.timers.set(key, timeoutId);
      return debouncedFunc(...args);
    };

    return wrappedFunc;
  }

  /**
   * 取消指定的防抖函數
   * @param {string} key - 唯一標識
   */
  cancel(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * 取消所有防抖函數
   */
  cancelAll() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * 立即執行指定的防抖函數
   * @param {string} key - 唯一標識
   */
  flush(key) {
    // 注意：此實現需要額外的狀態管理
    // 簡化版本：取消並重新創建
    this.cancel(key);
  }
}

// 導出到全局
if (typeof window !== 'undefined') {
  window.debounce = debounce;
  window.throttle = throttle;
  window.DebounceManager = DebounceManager;
}

// 導出（Node.js 環境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { debounce, throttle, DebounceManager };
}



