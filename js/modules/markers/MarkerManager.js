/**
 * MarkerManager - 标记管理器
 * 
 * 管理地图上的标记点
 */

class MarkerManager {
  constructor(map, eventBus = null) {
    this.map = map;
    this.eventBus = eventBus;
    this.markers = new Map(); // markerId -> Mapbox Marker
  }

  /**
   * 添加标记
   * @param {Object} markerData - 标记数据 {id, coordinates, type, color, size, icon, ...}
   * @returns {Object} Mapbox Marker 对象
   */
  addMarker(markerData) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    const {
      id,
      coordinates,
      type = 'point',
      color = '#ff0000',
      size = 10,
      icon = null,
      zIndex = 100
    } = markerData;

    // 创建 HTML 元素
    const el = this.createMarkerElement(type, color, size, icon);
    el.style.zIndex = zIndex;

    // 创建 Mapbox Marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat(coordinates)
      .addTo(this.map);

    // 存储标记
    this.markers.set(id, marker);

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('marker:added', { id, markerData, marker });
    }

    return marker;
  }

  /**
   * 移除标记
   * @param {string} markerId - 标记 ID
   */
  removeMarker(markerId) {
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.remove();
      this.markers.delete(markerId);

      // 触发事件
      if (this.eventBus) {
        this.eventBus.emit('marker:removed', { id: markerId });
      }
    }
  }

  /**
   * 更新标记位置
   * @param {string} markerId - 标记 ID
   * @param {number[]} coordinates - 新坐标 [lng, lat]
   */
  updateMarkerPosition(markerId, coordinates) {
    const marker = this.markers.get(markerId);
    if (marker) {
      marker.setLngLat(coordinates);

      // 触发事件
      if (this.eventBus) {
        this.eventBus.emit('marker:moved', { id: markerId, coordinates });
      }
    }
  }

  /**
   * 更新标记样式
   * @param {string} markerId - 标记 ID
   * @param {Object} style - 样式对象 {color, size, icon}
   */
  updateMarkerStyle(markerId, style) {
    const marker = this.markers.get(markerId);
    if (marker) {
      const el = marker.getElement();
      
      if (style.color || style.size || style.icon) {
        // 重新创建元素
        const markerData = this.getMarkerData(markerId);
        if (markerData) {
          const newEl = this.createMarkerElement(
            markerData.type || 'point',
            style.color || markerData.color,
            style.size || markerData.size,
            style.icon || markerData.icon
          );
          
          const coordinates = marker.getLngLat();
          marker.remove();
          
          const newMarker = new mapboxgl.Marker({
            element: newEl,
            anchor: 'center'
          })
            .setLngLat([coordinates.lng, coordinates.lat])
            .addTo(this.map);
          
          this.markers.set(markerId, newMarker);
        }
      }

      // 触发事件
      if (this.eventBus) {
        this.eventBus.emit('marker:style:updated', { id: markerId, style });
      }
    }
  }

  /**
   * 获取标记
   * @param {string} markerId - 标记 ID
   * @returns {Object|null} Mapbox Marker 对象
   */
  getMarker(markerId) {
    return this.markers.get(markerId) || null;
  }

  /**
   * 获取所有标记
   * @returns {Map} markerId -> Marker 的 Map
   */
  getAllMarkers() {
    return new Map(this.markers);
  }

  /**
   * 清空所有标记
   */
  clearAll() {
    this.markers.forEach(marker => marker.remove());
    this.markers.clear();

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('markers:cleared', {});
    }
  }

  /**
   * 创建标记元素
   * @private
   * @param {string} type - 标记类型 ('point', 'circle', 'pin')
   * @param {string} color - 颜色
   * @param {number} size - 大小
   * @param {string|null} icon - 图标 URL
   * @returns {HTMLElement} HTML 元素
   */
  createMarkerElement(type, color, size, icon) {
    const el = document.createElement('div');
    el.className = 'map-marker';

    if (icon) {
      // 使用图标
      const img = document.createElement('img');
      img.src = icon;
      img.style.width = `${size}px`;
      img.style.height = `${size}px`;
      el.appendChild(img);
    } else if (type === 'circle') {
      // 圆形标记
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = `2px solid ${color}`;
      el.style.borderColor = '#fff';
    } else if (type === 'pin') {
      // 图钉标记
      el.style.width = `${size}px`;
      el.style.height = `${size * 1.2}px`;
      el.style.background = `radial-gradient(circle at 50% 35%, ${color}, ${this.darkenColor(color, 0.3)})`;
      el.style.clipPath = 'polygon(50% 0%, 0% 100%, 50% 75%, 100% 100%)';
    } else {
      // 点标记（默认）
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    }

    return el;
  }

  /**
   * 加深颜色
   * @private
   * @param {string} color - 颜色（hex）
   * @param {number} factor - 加深因子
   * @returns {string} 加深后的颜色
   */
  darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgb(${Math.round(r * (1 - factor))}, ${Math.round(g * (1 - factor))}, ${Math.round(b * (1 - factor))})`;
  }

  /**
   * 获取标记数据（用于更新样式时使用）
   * @private
   * @param {string} markerId - 标记 ID
   * @returns {Object|null} 标记数据
   */
  getMarkerData(markerId) {
    // TODO: 从状态中获取标记数据
    // 这里应该从 WorkflowState 中获取
    return null;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.MarkerManager = MarkerManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkerManager;
}




