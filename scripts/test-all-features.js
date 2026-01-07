/**
 * 一鍵測試腳本 - 測試所有功能
 * 
 * 在瀏覽器控制台運行此腳本，自動測試所有主要功能
 * 
 * 使用方法：
 * 1. 打開瀏覽器開發者工具（F12）
 * 2. 複製此文件內容到控制台
 * 3. 運行腳本
 */

(async function testAllFeatures() {
  console.log('🧪 開始測試所有功能...\n');
  
  const testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    try {
      fn();
      testResults.passed++;
      testResults.tests.push({ name, status: '✅ PASSED' });
      console.log(`✅ ${name}`);
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({ name, status: '❌ FAILED', error: error.message });
      console.error(`❌ ${name}:`, error.message);
    }
  }

  // 測試 1: 檢查全局對象
  test('檢查全局對象', () => {
    if (!window.map) throw new Error('map 未定義');
    if (!window.stageManager) throw new Error('stageManager 未定義');
    if (!window.stageController) throw new Error('stageController 未定義');
    if (!window.contentListManager) throw new Error('contentListManager 未定義');
  });

  // 測試 2: 檢查地圖加載
  test('檢查地圖加載狀態', () => {
    if (!window.map) {
      throw new Error('map 未定義');
    }
    if (typeof window.map.loaded === 'function' && !window.map.loaded()) {
      throw new Error('地圖未加載');
    }
  });

  // 測試 3: 檢查工作流狀態
  test('檢查工作流狀態', () => {
    const state = window.stateManager?.getState();
    if (!state) throw new Error('無法獲取工作流狀態');
    if (!state.currentStage) throw new Error('currentStage 未定義');
  });

  // 測試 4: 檢查 UI 元素
  test('檢查 UI 元素', () => {
    const contentList = document.getElementById('content-list');
    if (!contentList) throw new Error('content-list 元素不存在');
    
    const areaStylePanel = document.getElementById('area-style-panel');
    if (!areaStylePanel) throw new Error('area-style-panel 元素不存在');
    
    const markerStylePanel = document.getElementById('marker-style-panel');
    if (!markerStylePanel) throw new Error('marker-style-panel 元素不存在');
    
    const labelStylePanel = document.getElementById('label-style-panel');
    if (!labelStylePanel) throw new Error('label-style-panel 元素不存在');
  });

  // 測試 5: 測試區域添加（模擬搜索）
  test('測試區域添加功能', () => {
    const state = window.stateManager?.getState();
    const initialCount = state?.countryStage?.areas?.length || 0;
    
    // 注意：這裡只是檢查功能存在，實際添加需要用戶交互
    if (typeof handleCountrySearch !== 'function') {
      throw new Error('handleCountrySearch 函數不存在');
    }
  });

  // 測試 6: 測試標記添加
  test('測試標記添加功能', () => {
    if (typeof enterMarkerAddMode !== 'function') {
      throw new Error('enterMarkerAddMode 函數不存在');
    }
  });

  // 測試 7: 測試文字標籤添加
  test('測試文字標籤添加功能', () => {
    if (typeof enterLabelAddMode !== 'function') {
      throw new Error('enterLabelAddMode 函數不存在');
    }
  });

  // 測試 8: 測試 ContentListManager 方法
  test('測試 ContentListManager 方法', () => {
    const cm = window.contentListManager;
    if (!cm) throw new Error('contentListManager 未定義');
    
    if (typeof cm.updateContentList !== 'function') {
      throw new Error('updateContentList 方法不存在');
    }
    
    if (typeof cm.selectArea !== 'function') {
      throw new Error('selectArea 方法不存在');
    }
    
    if (typeof cm.selectMarker !== 'function') {
      throw new Error('selectMarker 方法不存在');
    }
    
    if (typeof cm.selectTextLabel !== 'function') {
      throw new Error('selectTextLabel 方法不存在');
    }
    
    if (typeof cm.removeMarker !== 'function') {
      throw new Error('removeMarker 方法不存在');
    }
    
    if (typeof cm.removeTextLabel !== 'function') {
      throw new Error('removeTextLabel 方法不存在');
    }
  });

  // 測試 9: 測試 StageController 方法
  test('測試 StageController 方法', () => {
    const sc = window.stageController;
    if (!sc) throw new Error('stageController 未定義');
    
    if (typeof sc.removeMarker !== 'function') {
      throw new Error('removeMarker 方法不存在');
    }
    
    if (typeof sc.removeTextLabel !== 'function') {
      throw new Error('removeTextLabel 方法不存在');
    }
  });

  // 測試 10: 測試導出功能
  test('測試導出功能', () => {
    const exportBtn = document.getElementById('export-btn');
    if (!exportBtn) throw new Error('export-btn 按鈕不存在');
    
    if (typeof showExportDialog !== 'function') {
      throw new Error('showExportDialog 函數不存在');
    }
  });

  // 測試 11: 檢查事件總線
  test('檢查事件總線', () => {
    if (!window.eventBus) throw new Error('eventBus 未定義');
    if (typeof window.eventBus.emit !== 'function') {
      throw new Error('eventBus.emit 方法不存在');
    }
    if (typeof window.eventBus.on !== 'function') {
      throw new Error('eventBus.on 方法不存在');
    }
  });

  // 測試 12: 檢查模組管理器
  test('檢查模組管理器', () => {
    const state = window.stateManager?.getState();
    if (!state) throw new Error('無法獲取狀態');
    
    // 檢查 annotations 結構
    if (!state.annotations) throw new Error('annotations 未定義');
    if (!Array.isArray(state.annotations.markers)) {
      throw new Error('annotations.markers 不是數組');
    }
    if (!Array.isArray(state.annotations.textLabels)) {
      throw new Error('annotations.textLabels 不是數組');
    }
  });

  // 輸出測試結果
  console.log('\n📊 測試結果總結:');
  console.log(`✅ 通過: ${testResults.passed}`);
  console.log(`❌ 失敗: ${testResults.failed}`);
  console.log(`📈 總計: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 所有測試通過！');
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查以上錯誤信息');
  }
  
  return testResults;
})();

