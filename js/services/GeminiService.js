/**
 * Gemini Service - Gemini AI 服務
 * 
 * 處理與 Google Gemini API 的通信
 * 包含緩存機制、錯誤處理、重試邏輯
 */

class GeminiServiceCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 50; // 最多緩存 50 個請求
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 小時過期
    this.lastRequestTime = 0;
    this.minRequestInterval = 2000; // 最小請求間隔 2 秒
    this.pendingRequests = new Map(); // 防止重複請求
  }

  /**
   * 生成緩存鍵（基於文本的哈希）
   * @param {string} text - 文本內容
   * @returns {string} 緩存鍵
   */
  generateCacheKey(text) {
    let hash = 0;
    const normalizedText = text.trim().toLowerCase();
    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `gemini_${Math.abs(hash)}`;
  }

  /**
   * 獲取緩存的結果
   * @param {string} text - 文本內容
   * @returns {Object|null} 緩存的結果
   */
  get(text) {
    const key = this.generateCacheKey(text);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // 檢查是否過期
    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 設置緩存
   * @param {string} text - 文本內容
   * @param {Object} data - 要緩存的數據
   */
  set(text, data) {
    const key = this.generateCacheKey(text);
    
    // 如果緩存已滿，刪除最舊的項
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * 檢查是否應該等待（請求間隔控制）
   * @returns {Promise<void>}
   */
  async waitIfNeeded() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 檢查是否有正在進行的相同請求
   * @param {string} text - 文本內容
   * @returns {boolean}
   */
  isPending(text) {
    const key = this.generateCacheKey(text);
    return this.pendingRequests.has(key);
  }

  /**
   * 標記請求為進行中
   * @param {string} text - 文本內容
   * @returns {Promise} 等待 Promise
   */
  markPending(text) {
    const key = this.generateCacheKey(text);
    return new Promise((resolve) => {
      this.pendingRequests.set(key, resolve);
    });
  }

  /**
   * 標記請求完成
   * @param {string} text - 文本內容
   */
  unmarkPending(text) {
    const key = this.generateCacheKey(text);
    const resolver = this.pendingRequests.get(key);
    if (resolver) {
      this.pendingRequests.delete(key);
      resolver();
    }
  }

  /**
   * 清空緩存
   */
  clear() {
    this.cache.clear();
  }
}

/**
 * Gemini Service
 * Gemini AI 服務類
 */
class GeminiService {
  constructor(config = {}) {
    this.config = config;
    this.cache = new GeminiServiceCache();
    this.eventBus = config.eventBus || null;
    this.logger = config.logger || null;
  }

  /**
   * 截斷文本以防止超過 token 限制
   * @param {string} text - 要截斷的文本
   * @param {number} maxLength - 最大長度（字符）
   * @returns {string} 截斷後的文本
   */
  truncateText(text, maxLength = 15000) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    
    const truncated = text.substring(0, maxLength);
    return truncated + '\n\n[... 文本過長已截斷，僅分析前 ' + maxLength.toLocaleString() + ' 個字符 ...]';
  }

  /**
   * 從錯誤響應中提取重試延遲
   * @param {Object} errorData - 錯誤響應數據
   * @returns {number} 重試延遲（毫秒）
   */
  extractRetryDelay(errorData) {
    try {
      const retryInfo = errorData.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
      if (retryInfo && retryInfo.retryDelay) {
        let delayStr = String(retryInfo.retryDelay).replace('s', '').trim();
        const delay = parseFloat(delayStr);
        if (!isNaN(delay) && delay > 0) {
          return Math.min(delay * 1000, 60000); // 轉換為毫秒，最多 60 秒
        }
      }
      
      const errorMessage = errorData.error?.message || '';
      const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
      if (retryMatch && retryMatch[1]) {
        const delay = parseFloat(retryMatch[1]);
        if (!isNaN(delay) && delay > 0) {
          return Math.min(delay * 1000, 60000);
        }
      }
    } catch (error) {
      // 忽略錯誤
    }
    
    return 5000; // 默認 5 秒
  }

  /**
   * 使用 Gemini API 分析文本
   * @param {string} text - 要分析的文本
   * @param {Object} options - 選項
   * @returns {Promise<Object>} 分析結果
   */
  async analyzeText(text, options = {}) {
    const {
      maxRetries = 2,
      retryAttempt = 0,
      onRetry = null,
      promptBuilder = null
    } = options;

    // 檢查緩存
    const cached = this.cache.get(text);
    if (cached) {
      if (this.logger) {
        this.logger.info('Using cached Gemini result');
      }
      return cached;
    }

    // 檢查是否有正在進行的請求
    if (this.cache.isPending(text)) {
      await this.cache.markPending(text);
      // 請求完成後，再次檢查緩存
      return this.cache.get(text) || this.analyzeText(text, options);
    }

    // 標記為進行中
    const pendingPromise = this.cache.markPending(text);

    try {
      // 等待請求間隔
      await this.cache.waitIfNeeded();

      // 截斷文本
      const truncatedText = this.truncateText(text);

      // 構建提示詞
      const prompt = promptBuilder ? promptBuilder(truncatedText) : truncatedText;

      // 構建請求
      const CONFIG = typeof window !== 'undefined' ? window.CONFIG : {};
      const endpoint = CONFIG.GEMINI?.PROXY_ENDPOINT || '/api/gemini/generateContent';
      const requestBody = {
        text: prompt,
        options: options.requestOptions || {}
      };

      // 發送請求
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // 緩存結果
      this.cache.set(text, result);

      // 標記請求完成（unmarkPending 會調用 resolve 函數）
      this.cache.unmarkPending(text);

      // 觸發事件
      if (this.eventBus) {
        this.eventBus.emit('gemini:analysis:complete', { text, result });
      }

      return result;
    } catch (error) {
      // 標記請求完成（unmarkPending 會調用 resolve 函數）
      this.cache.unmarkPending(text);

      // 處理重試
      if (retryAttempt < maxRetries) {
        const retryDelay = this.extractRetryDelay(error.response?.data || {});
        
        if (onRetry && typeof onRetry === 'function') {
          onRetry(retryAttempt + 1, retryDelay);
        }

        if (this.logger) {
          this.logger.warn(`Gemini API error, retrying in ${retryDelay}ms (attempt ${retryAttempt + 1}/${maxRetries})`);
        }

        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        return this.analyzeText(text, {
          ...options,
          retryAttempt: retryAttempt + 1
        });
      }

      // 觸發錯誤事件
      if (this.eventBus) {
        this.eventBus.emit('gemini:analysis:error', { text, error });
      }

      throw error;
    }
  }

  /**
   * 清空緩存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 導出到全局
if (typeof window !== 'undefined') {
  window.GeminiService = GeminiService;
  window.GeminiServiceCache = GeminiServiceCache;
}

// 導出（Node.js 環境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiService, GeminiServiceCache };
}

