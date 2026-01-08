/**
 * GeometryStore - 几何数据存储
 * 
 * 全局几何数据存储，使用引用管理而非完整 GeoJSON
 */

class GeometryStore {
  constructor() {
    this.store = new Map(); // gadmId -> GeoJSON
    this.metadata = new Map(); // gadmId -> metadata
  }

  /**
   * 获取几何数据
   * @param {string} gadmId - GADM ID
   * @returns {Object|null} GeoJSON 几何数据
   */
  get(gadmId) {
    return this.store.get(gadmId) || null;
  }

  /**
   * 设置几何数据
   * @param {string} gadmId - GADM ID
   * @param {Object} geometry - GeoJSON 几何数据
   * @param {Object} metadata - 元数据（可选）
   */
  set(gadmId, geometry, metadata = {}) {
    this.store.set(gadmId, geometry);
    if (metadata && Object.keys(metadata).length > 0) {
      this.metadata.set(gadmId, metadata);
    }
  }

  /**
   * 检查是否存在
   * @param {string} gadmId - GADM ID
   * @returns {boolean}
   */
  has(gadmId) {
    return this.store.has(gadmId);
  }

  /**
   * 删除几何数据
   * @param {string} gadmId - GADM ID
   */
  delete(gadmId) {
    this.store.delete(gadmId);
    this.metadata.delete(gadmId);
  }

  /**
   * 批量获取
   * @param {string[]} gadmIds - GADM ID 数组
   * @returns {Map} gadmId -> geometry 的 Map
   */
  getBatch(gadmIds) {
    const result = new Map();
    gadmIds.forEach(id => {
      const geometry = this.get(id);
      if (geometry) {
        result.set(id, geometry);
      }
    });
    return result;
  }

  /**
   * 批量设置
   * @param {Array} items - [{gadmId, geometry, metadata}, ...]
   */
  setBatch(items) {
    items.forEach(item => {
      this.set(item.gadmId, item.geometry, item.metadata);
    });
  }

  /**
   * 获取元数据
   * @param {string} gadmId - GADM ID
   * @returns {Object|null} 元数据
   */
  getMetadata(gadmId) {
    return this.metadata.get(gadmId) || null;
  }

  /**
   * 清空所有数据
   */
  clear() {
    this.store.clear();
    this.metadata.clear();
  }

  /**
   * 获取存储大小
   * @returns {number} 存储的几何数据数量
   */
  size() {
    return this.store.size;
  }

  /**
   * 获取所有 GADM IDs
   * @returns {string[]} GADM ID 数组
   */
  getAllIds() {
    return Array.from(this.store.keys());
  }

  /**
   * 清理未使用的数据（基于引用计数）
   * @param {Set} usedIds - 正在使用的 GADM ID 集合
   */
  cleanup(usedIds) {
    const allIds = this.getAllIds();
    allIds.forEach(id => {
      if (!usedIds.has(id)) {
        this.delete(id);
      }
    });
  }
}

// 导出全局单例
if (typeof window !== 'undefined') {
  window.GeometryStore = GeometryStore;
  // 创建全局实例
  window.geometryStore = new GeometryStore();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeometryStore;
}




