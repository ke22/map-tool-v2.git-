/**
 * LabelManager - 标签管理器
 * 
 * 管理地图上的文字标签
 */

class LabelManager {
  constructor(map, eventBus = null) {
    this.map = map;
    this.eventBus = eventBus;
    this.labels = new Map(); // labelId -> Mapbox Marker
  }

  /**
   * 添加文字标签
   * @param {Object} labelData - 标签数据 {id, text, coordinates, fontSize, color, backgroundColor, padding, zIndex}
   * @returns {Object} Mapbox Marker 对象
   */
  addLabel(labelData) {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    const {
      id,
      text,
      coordinates,
      fontSize = 14,
      color = '#333',
      backgroundColor = null,
      padding = 4,
      zIndex = 200
    } = labelData;

    // 创建 HTML 元素
    const el = this.createLabelElement(text, fontSize, color, backgroundColor, padding);
    el.style.zIndex = zIndex;

    // 创建 Mapbox Marker
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat(coordinates)
      .addTo(this.map);

    // 存储标签
    this.labels.set(id, marker);

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('label:added', { id, labelData, marker });
    }

    return marker;
  }

  /**
   * 移除标签
   * @param {string} labelId - 标签 ID
   */
  removeLabel(labelId) {
    const marker = this.labels.get(labelId);
    if (marker) {
      marker.remove();
      this.labels.delete(labelId);

      // 触发事件
      if (this.eventBus) {
        this.eventBus.emit('label:removed', { id: labelId });
      }
    }
  }

  /**
   * 更新标签位置
   * @param {string} labelId - 标签 ID
   * @param {number[]} coordinates - 新坐标 [lng, lat]
   */
  updateLabelPosition(labelId, coordinates) {
    const marker = this.labels.get(labelId);
    if (marker) {
      marker.setLngLat(coordinates);

      // 触发事件
      if (this.eventBus) {
        this.eventBus.emit('label:moved', { id: labelId, coordinates });
      }
    }
  }

  /**
   * 更新标签文本
   * @param {string} labelId - 标签 ID
   * @param {string} text - 新文本
   */
  updateLabelText(labelId, text) {
    const marker = this.labels.get(labelId);
    if (marker) {
      const el = marker.getElement();
      const textEl = el.querySelector('.label-text');
      if (textEl) {
        textEl.textContent = text;
      }

      // 触发事件
      if (this.eventBus) {
        this.eventBus.emit('label:text:updated', { id: labelId, text });
      }
    }
  }

  /**
   * 更新标签样式
   * @param {string} labelId - 标签 ID
   * @param {Object} style - 样式对象 {fontSize, color, backgroundColor, padding}
   */
  updateLabelStyle(labelId, style) {
    const marker = this.labels.get(labelId);
    if (marker) {
      const el = marker.getElement();
      
      if (style.fontSize) {
        const textEl = el.querySelector('.label-text');
        if (textEl) {
          textEl.style.fontSize = `${style.fontSize}px`;
        }
      }

      if (style.color) {
        const textEl = el.querySelector('.label-text');
        if (textEl) {
          textEl.style.color = style.color;
        }
      }

      if (style.backgroundColor !== undefined) {
        el.style.backgroundColor = style.backgroundColor || 'transparent';
      }

      if (style.padding) {
        el.style.padding = `${style.padding}px`;
      }

      // 触发事件
      if (this.eventBus) {
        this.eventBus.emit('label:style:updated', { id: labelId, style });
      }
    }
  }

  /**
   * 获取标签
   * @param {string} labelId - 标签 ID
   * @returns {Object|null} Mapbox Marker 对象
   */
  getLabel(labelId) {
    return this.labels.get(labelId) || null;
  }

  /**
   * 获取所有标签
   * @returns {Map} labelId -> Marker 的 Map
   */
  getAllLabels() {
    return new Map(this.labels);
  }

  /**
   * 清空所有标签
   */
  clearAll() {
    this.labels.forEach(marker => marker.remove());
    this.labels.clear();

    // 触发事件
    if (this.eventBus) {
      this.eventBus.emit('labels:cleared', {});
    }
  }

  /**
   * 创建标签元素
   * @private
   * @param {string} text - 文本内容
   * @param {number} fontSize - 字体大小
   * @param {string} color - 文字颜色
   * @param {string|null} backgroundColor - 背景颜色
   * @param {number} padding - 内边距
   * @returns {HTMLElement} HTML 元素
   */
  createLabelElement(text, fontSize, color, backgroundColor, padding) {
    const el = document.createElement('div');
    el.className = 'map-label';

    const textEl = document.createElement('span');
    textEl.className = 'label-text';
    textEl.textContent = text;
    textEl.style.fontSize = `${fontSize}px`;
    textEl.style.color = color;
    textEl.style.whiteSpace = 'nowrap';
    textEl.style.userSelect = 'none';
    textEl.style.pointerEvents = 'none';

    el.appendChild(textEl);

    // 样式
    el.style.padding = `${padding}px`;
    el.style.borderRadius = '4px';
    el.style.pointerEvents = 'none';
    el.style.userSelect = 'none';

    if (backgroundColor) {
      el.style.backgroundColor = backgroundColor;
      el.style.backdropFilter = 'blur(4px)';
    } else {
      el.style.background = 'rgba(255, 255, 255, 0.8)';
      el.style.backdropFilter = 'blur(4px)';
    }

    // 文本阴影（提高可读性）
    textEl.style.textShadow = '1px 1px 2px rgba(0,0,0,0.1)';

    return el;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.LabelManager = LabelManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LabelManager;
}




