#!/usr/bin/env node
/**
 * 從 hkn 項目的優化 GADM 文件中提取單個國家的數據
 * 
 * 用法:
 *   node scripts/extract-country-from-optimized.js TWN
 *   node scripts/extract-country-from-optimized.js GBR
 */

const fs = require('fs');
const path = require('path');

const countryCode = process.argv[2];
const level = process.argv[3] || '0'; // 默認 Level 0

if (!countryCode) {
  console.error('用法: node scripts/extract-country-from-optimized.js <COUNTRY_CODE> [LEVEL]');
  console.error('例如: node scripts/extract-country-from-optimized.js TWN 0');
  process.exit(1);
}

// 優先檢查多個可能的數據源位置
const possiblePaths = [
  path.join(__dirname, '../../map/data/gadm/gadm_level' + level + '.geojson'),
  path.join(__dirname, '../../hkn/data/gadm/optimized/gadm_level' + level + '_optimized.geojson'),
  '/Users/yulincho/Documents/01_Github/map/data/gadm/gadm_level' + level + '.geojson'
];

// 找到第一個存在的文件
let sourceFile = null;
for (const filePath of possiblePaths) {
  if (fs.existsSync(filePath)) {
    sourceFile = filePath;
    console.log(`✅ 找到數據文件: ${sourceFile}`);
    break;
  }
}
const targetDir = path.join(__dirname, '../../data/gadm', countryCode);
const targetFile = path.join(targetDir, `${countryCode}_${level}.geojson`);

if (!sourceFile || !fs.existsSync(sourceFile)) {
  console.error(`錯誤: 源文件不存在`);
  console.error(`檢查的路徑:`);
  console.error(`  1. ${path.join(mapDataPath, `gadm_level${level}.geojson`)}`);
  console.error(`  2. ${path.join(hknDataPath, `gadm_level${level}_optimized.geojson`)}`);
  process.exit(1);
}

console.log(`正在從 ${sourceFile} 提取 ${countryCode} (Level ${level})...`);

try {
  // 讀取源文件
  const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  
  // 過濾出指定國家的要素
  const filteredFeatures = sourceData.features.filter(feature => {
    const props = feature.properties || {};
    // GADM 屬性名稱可能是 GID_0, ISO, COUNTRY_CODE 等
    const gid0 = props.GID_0 || props.ISO || props.COUNTRY_CODE || props.GID_0;
    return gid0 === countryCode;
  });

  if (filteredFeatures.length === 0) {
    console.warn(`警告: 在源文件中未找到 ${countryCode} 的數據`);
    console.log('可用的國家代碼 (前10個):');
    const countries = new Set();
    sourceData.features.slice(0, 100).forEach(f => {
      const gid0 = f.properties?.GID_0 || f.properties?.ISO;
      if (gid0) countries.add(gid0);
    });
    console.log(Array.from(countries).slice(0, 10).join(', '));
    process.exit(1);
  }

  // 創建目標目錄
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 創建新的 GeoJSON
  const countryData = {
    type: 'FeatureCollection',
    features: filteredFeatures
  };

  // 寫入文件
  fs.writeFileSync(targetFile, JSON.stringify(countryData, null, 2));
  
  console.log(`✅ 成功提取 ${filteredFeatures.length} 個要素到 ${targetFile}`);
  const fileSize = fs.statSync(targetFile).size;
  console.log(`   文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  
} catch (error) {
  console.error('錯誤:', error.message);
  process.exit(1);
}

