/**
 * Logger - 日志系统
 * 
 * 提供结构化的日志记录功能
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

class Logger {
  constructor(moduleName = 'App', config = {}) {
    this.moduleName = moduleName;
    this.level = config.level || (this.getDefaultLevel());
    this.enableConsole = config.enableConsole !== false;
    this.logs = config.enableMemory === true ? [] : null;
    this.maxLogs = config.maxLogs || 1000;
  }

  /**
   * 获取默认日志级别
   * @returns {number} 日志级别
   */
  getDefaultLevel() {
    if (typeof window !== 'undefined') {
      const debug = localStorage.getItem('debug');
      if (debug === 'true') {
        return LOG_LEVELS.DEBUG;
      }
      const env = window.CONFIG?.NODE_ENV || 'production';
      return env === 'development' ? LOG_LEVELS.INFO : LOG_LEVELS.WARN;
    }
    return (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') 
      ? LOG_LEVELS.INFO 
      : LOG_LEVELS.WARN;
  }

  /**
   * 记录日志
   * @private
   * @param {number} level - 日志级别
   * @param {string} message - 日志消息
   * @param {*} data - 附加数据
   */
  log(level, message, data = null) {
    if (level < this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    const logEntry = {
      timestamp,
      level: levelName,
      module: this.moduleName,
      message,
      data
    };

    // 输出到控制台
    if (this.enableConsole) {
      const consoleMethod = this.getConsoleMethod(level);
      const prefix = `[${timestamp}] [${levelName}] [${this.moduleName}]`;
      
      if (data !== null) {
        consoleMethod(prefix, message, data);
      } else {
        consoleMethod(prefix, message);
      }
    }

    // 存储到内存（如果启用）
    if (this.logs !== null) {
      this.logs.push(logEntry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
    }
  }

  /**
   * 获取对应的 console 方法
   * @private
   * @param {number} level - 日志级别
   * @returns {Function} console 方法
   */
  getConsoleMethod(level) {
    switch (level) {
      case LOG_LEVELS.DEBUG:
        return console.debug || console.log;
      case LOG_LEVELS.INFO:
        return console.info || console.log;
      case LOG_LEVELS.WARN:
        return console.warn;
      case LOG_LEVELS.ERROR:
      case LOG_LEVELS.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * 调试日志
   * @param {string} message - 日志消息
   * @param {*} data - 附加数据
   */
  debug(message, data = null) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  /**
   * 信息日志
   * @param {string} message - 日志消息
   * @param {*} data - 附加数据
   */
  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  /**
   * 警告日志
   * @param {string} message - 日志消息
   * @param {*} data - 附加数据
   */
  warn(message, data = null) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  /**
   * 错误日志
   * @param {string} message - 日志消息
   * @param {Error|*} error - 错误对象或附加数据
   */
  error(message, error = null) {
    this.log(LOG_LEVELS.ERROR, message, error);
  }

  /**
   * 致命错误日志
   * @param {string} message - 日志消息
   * @param {Error|*} error - 错误对象或附加数据
   */
  fatal(message, error = null) {
    this.log(LOG_LEVELS.FATAL, message, error);
  }

  /**
   * 获取所有日志
   * @returns {Array} 日志数组
   */
  getLogs() {
    return this.logs ? [...this.logs] : [];
  }

  /**
   * 清空日志
   */
  clearLogs() {
    if (this.logs !== null) {
      this.logs = [];
    }
  }

  /**
   * 设置日志级别
   * @param {number|string} level - 日志级别
   */
  setLevel(level) {
    if (typeof level === 'string') {
      level = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
    }
    this.level = level;
  }
}

// 导出到全局（浏览器环境）
if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.LOG_LEVELS = LOG_LEVELS;
}

// 导出（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
  module.exports.LOG_LEVELS = LOG_LEVELS;
}

