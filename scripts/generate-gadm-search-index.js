/**
 * Generate GADM Search Index
 * 
 * 從 GADM Level 0 和 Level 1 數據生成統一的搜索索引
 * 支持多語言名稱匹配和快速搜索
 */

const fs = require('fs');
const path = require('path');

// 路徑配置
const GADM_LEVEL0_PATH = path.join(__dirname, '../data/gadm/optimized/gadm_level0_optimized.geojson');
const GADM_LEVEL1_PATH = path.join(__dirname, '../data/gadm/optimized/gadm_level1_optimized.geojson');
const OUTPUT_DIR = path.join(__dirname, '../data/gadm');
const OUTPUT_LEVEL0 = path.join(OUTPUT_DIR, 'search-index-level0.json');
const OUTPUT_LEVEL1 = path.join(OUTPUT_DIR, 'search-index-level1.json');

/**
 * 提取所有可能的名称变体
 * @param {Object} feature - GeoJSON Feature
 * @param {number} level - 0 (country) 或 1 (administration)
 * @returns {Object} 包含所有名称变体的对象
 */
function extractNames(feature, level) {
  const props = feature.properties || {};
  const names = {
    en: [],
    local: [],
    variants: [],
    aliases: []  // 所有可搜索的键（大写）
  };

  if (level === 0) {
    // Level 0: 国家名称字段
    const nameFields = [
      { key: 'NAME_0', lang: 'en' },
      { key: 'NAME_EN', lang: 'en' },
      { key: 'NAME', lang: 'en' },
      { key: 'NL_NAME_0', lang: 'local' },
      { key: 'VARNAME_0', lang: 'variants' },
      { key: 'COUNTRY', lang: 'en' },
      { key: 'ISO_A3', lang: 'gid' },
      { key: 'ISO_CODE', lang: 'gid' }
    ];

    nameFields.forEach(({ key, lang }) => {
      const value = props[key];
      if (value && value !== 'NA' && String(value).trim() !== '') {
        const cleanValue = String(value).trim();
        if (lang === 'en') {
          if (!names.en.includes(cleanValue)) {
            names.en.push(cleanValue);
            names.aliases.push(cleanValue.toUpperCase());
          }
        } else if (lang === 'local') {
          if (!names.local.includes(cleanValue)) {
            names.local.push(cleanValue);
            names.aliases.push(cleanValue.toUpperCase());
          }
        } else if (lang === 'variants') {
          names.variants.push(cleanValue);
          names.aliases.push(cleanValue.toUpperCase());
        } else if (lang === 'gid') {
          names.aliases.push(cleanValue.toUpperCase());
        }
      }
    });

    // 添加 GID_0 作为搜索键
    const gid0 = props.GID_0;
    if (gid0) {
      names.aliases.push(String(gid0).toUpperCase());
    }

  } else if (level === 1) {
    // Level 1: 行政区名称字段
    const nameFields = [
      { key: 'NAME_1', lang: 'en' },
      { key: 'NL_NAME_1', lang: 'local' },
      { key: 'VARNAME_1', lang: 'variants' },
      { key: 'NAME_1_EN', lang: 'en' },
      { key: 'NAME_1_ZH', lang: 'zh' },
      { key: 'STATE_NAME', lang: 'en' },
      { key: 'PROVINCE_NAME', lang: 'en' },
      { key: 'REGION_NAME', lang: 'en' },
      { key: 'NAME', lang: 'en' }
    ];

    nameFields.forEach(({ key, lang }) => {
      const value = props[key];
      if (value && value !== 'NA' && String(value).trim() !== '') {
        const cleanValue = String(value).trim();
        if (lang === 'en' || lang === 'zh') {
          if (!names.en.includes(cleanValue)) {
            names.en.push(cleanValue);
          }
          names.aliases.push(cleanValue.toUpperCase());
        } else if (lang === 'local') {
          if (!names.local.includes(cleanValue)) {
            names.local.push(cleanValue);
          }
          names.aliases.push(cleanValue.toUpperCase());
        } else if (lang === 'variants') {
          names.variants.push(cleanValue);
          names.aliases.push(cleanValue.toUpperCase());
        }
      }
    });

    // 添加 GID_1 作为搜索键
    const gid1 = props.GID_1 || props.gid_1;
    if (gid1) {
      names.aliases.push(String(gid1).toUpperCase());
    }
  }

  // 去重 aliases
  names.aliases = [...new Set(names.aliases)];

  return names;
}

/**
 * 生成 Level 0 索引（国家）
 */
function generateLevel0Index() {
  console.log('📦 Generating Level 0 (Country) search index...');
  
  if (!fs.existsSync(GADM_LEVEL0_PATH)) {
    throw new Error(`Level 0 file not found: ${GADM_LEVEL0_PATH}`);
  }

  const geojson = JSON.parse(fs.readFileSync(GADM_LEVEL0_PATH, 'utf8'));
  const index = {};
  let total = 0;

  console.log(`   Processing ${geojson.features.length} features...`);

  geojson.features.forEach(feature => {
    const props = feature.properties || {};
    const code = props.GID_0 || props.ISO_A3 || props.ISO_CODE;
    
    if (!code) {
      return;
    }

    const countryCode = String(code).toUpperCase();
    const names = extractNames(feature, 0);

    index[countryCode] = {
      code: countryCode,
      names: names,
      searchKeys: names.aliases, // 所有可搜索的键（大写）
      // 保留原始属性以便调试
      _properties: {
        NAME_0: props.NAME_0,
        NL_NAME_0: props.NL_NAME_0,
        GID_0: props.GID_0,
        COUNTRY: props.COUNTRY
      }
    };

    total++;
  });

  // 尝试补充中文映射（从现有 CountryCodes 补充）
  try {
    // 这里不直接 require，因为 CountryCodes 可能是浏览器端代码
    // 如果需要，可以单独处理中文映射
    console.log(`   Note: Chinese mappings can be added separately if needed`);
  } catch (error) {
    // 忽略，中文映射可以后续添加
  }

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_LEVEL0, JSON.stringify(index, null, 2), 'utf8');
  console.log(`✅ Level 0 index generated: ${total} countries`);
  console.log(`   Output: ${OUTPUT_LEVEL0}`);
  return index;
}

/**
 * 生成 Level 1 索引（行政区）
 */
function generateLevel1Index() {
  console.log('📦 Generating Level 1 (Administration) search index...');
  
  if (!fs.existsSync(GADM_LEVEL1_PATH)) {
    throw new Error(`Level 1 file not found: ${GADM_LEVEL1_PATH}`);
  }

  const geojson = JSON.parse(fs.readFileSync(GADM_LEVEL1_PATH, 'utf8'));
  const index = {};
  let total = 0;

  console.log(`   Processing ${geojson.features.length} features...`);

  geojson.features.forEach(feature => {
    const props = feature.properties || {};
    const gid1 = props.GID_1 || props.gid_1;
    const countryCode = props.GID_0 || props.COUNTRY || '';
    
    if (!gid1 || !countryCode) {
      return;
    }

    const country = String(countryCode).toUpperCase();
    const gid = String(gid1).toUpperCase();
    
    if (!index[country]) {
      index[country] = {};
    }

    const names = extractNames(feature, 1);

    index[country][gid] = {
      gid: gid,
      country: country,
      names: names,
      searchKeys: names.aliases, // 所有可搜索的键（大写）
      // 保留原始属性以便调试
      _properties: {
        NAME_1: props.NAME_1,
        NL_NAME_1: props.NL_NAME_1,
        VARNAME_1: props.VARNAME_1,
        GID_1: props.GID_1
      }
    };

    total++;
  });

  // 确保输出目录存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_LEVEL1, JSON.stringify(index, null, 2), 'utf8');
  
  const countryCount = Object.keys(index).length;
  console.log(`✅ Level 1 index generated: ${total} regions across ${countryCount} countries`);
  console.log(`   Output: ${OUTPUT_LEVEL1}`);
  
  // 统计信息（前10个国家）
  console.log(`   Top countries by region count:`);
  const countryStats = Object.entries(index)
    .map(([country, regions]) => [country, Object.keys(regions).length])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  countryStats.forEach(([country, count]) => {
    console.log(`     ${country}: ${count} regions`);
  });

  return index;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Generating GADM search indices...\n');
  
  try {
    const level0Index = generateLevel0Index();
    console.log('');
    const level1Index = generateLevel1Index();
    
    console.log('\n✅ All indices generated successfully!');
    console.log(`   Level 0: ${Object.keys(level0Index).length} countries`);
    console.log(`   Level 1: ${Object.keys(level1Index).length} countries`);
    console.log(`\n💡 Index files are ready to use.`);
    console.log(`   They will be loaded automatically when the application starts.`);
    
  } catch (error) {
    console.error('❌ Error generating indices:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  generateLevel0Index,
  generateLevel1Index,
  extractNames
};
