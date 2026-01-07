/**
 * DOM Element Cache Utility
 * DOM 元素緩存工具
 * 
 * 減少重複的 DOM 查詢，提升性能
 */

class DOMCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 通過 ID 獲取元素（帶緩存）
   * @param {string} id - 元素 ID
   * @param {boolean} forceRefresh - 是否強制刷新緩存
   * @returns {HTMLElement|null} DOM 元素
   */
  get(id, forceRefresh = false) {
    if (forceRefresh || !this.cache.has(id)) {
      const element = document.getElementById(id);
      if (element) {
        this.cache.set(id, element);
      } else {
        // 緩存 null 以避免重複查詢失敗的元素
        this.cache.set(id, null);
      }
    }
    
    return this.cache.get(id);
  }

  /**
   * 通過選擇器獲取元素（帶緩存）
   * @param {string} selector - CSS 選擇器
   * @param {boolean} forceRefresh - 是否強制刷新緩存
   * @returns {NodeList|HTMLElement|null} DOM 元素或元素列表
   */
  query(selector, forceRefresh = false) {
    if (forceRefresh || !this.cache.has(selector)) {
      const elements = document.querySelectorAll(selector);
      this.cache.set(selector, elements.length === 1 ? elements[0] : elements);
    }
    
    return this.cache.get(selector);
  }

  /**
   * 清空緩存（指定元素或全部）
   * @param {string|null} key - 要清空的鍵，null 表示清空全部
   */
  clear(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 使緩存失效（當 DOM 結構改變時調用）
   */
  invalidate() {
    this.cache.clear();
  }

  /**
   * 獲取緩存統計信息
   * @returns {Object} 統計信息
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 預加載常用元素
   * @param {string[]} ids - 元素 ID 數組
   */
  preload(ids) {
    ids.forEach(id => this.get(id));
  }
}

// 創建全局單例
const domCache = new DOMCache();

// 導出到全局
if (typeof window !== 'undefined') {
  window.DOMCache = DOMCache;
  window.domCache = domCache;
}

// 導出（Node.js 環境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DOMCache, domCache };
}



