/**
 * Optimize GADM GeoJSON files using mapshaper
 * 
 * This script simplifies GeoJSON files to reduce file size and improve loading performance.
 * 
 * Requirements:
 * - mapshaper installed: npm install -g mapshaper
 * - Original GADM GeoJSON files in data/gadm/
 * 
 * Usage:
 *   node scripts/optimize-gadm.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data', 'gadm');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'gadm', 'optimized');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Data directory not found: ${DATA_DIR}`);
    process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}`);
}

/**
 * Check if mapshaper is installed
 */
function checkMapshaper() {
    try {
        execSync('mapshaper --version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Optimize GeoJSON with mapshaper
 */
function optimizeGeoJSON(level) {
    const inputFile = path.join(DATA_DIR, `gadm_level${level}.geojson`);
    const outputFile = path.join(OUTPUT_DIR, `gadm_level${level}_optimized.geojson`);
    
    if (!fs.existsSync(inputFile)) {
        console.warn(`⚠️  Input file not found: ${inputFile}`);
        return false;
    }
    
    // Simplify percentages (higher number = less detail = smaller file)
    // Level 0 (countries): 15% - keep more detail for country boundaries
    // Level 1 (states): 8% - medium detail for state boundaries
    // Level 2 (cities): 5% - can reduce more for city boundaries
    const simplify = {
        0: '15%',  // Countries - keep more detail
        1: '8%',   // States - medium detail
        2: '5%'    // Cities - can reduce more
    };
    
    console.log(`\n🔄 Optimizing Level ${level}...`);
    console.log(`   Input: ${inputFile}`);
    console.log(`   Output: ${outputFile}`);
    console.log(`   Simplifying to ${simplify[level]} detail`);
    
    try {
        execSync(`mapshaper "${inputFile}" -simplify ${simplify[level]} -o "${outputFile}"`, {
            stdio: 'inherit'
        });
        
        const inputStats = fs.statSync(inputFile);
        const outputStats = fs.statSync(outputFile);
        const reduction = ((1 - outputStats.size / inputStats.size) * 100).toFixed(1);
        
        console.log(`✅ Optimized!`);
        console.log(`   Original: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Optimized: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Reduction: ${reduction}%`);
        
        return true;
    } catch (error) {
        console.error(`❌ Optimization failed:`, error.message);
        return false;
    }
}

// Main execution
console.log('🎨 GADM GeoJSON Optimization');
console.log('='.repeat(50));
console.log('');

// Check if mapshaper is installed
if (!checkMapshaper()) {
    console.error('❌ mapshaper is not installed');
    console.error('');
    console.error('Please install mapshaper:');
    console.error('  npm install -g mapshaper');
    console.error('');
    console.error('Or use homebrew (macOS):');
    console.error('  brew install mapshaper');
    process.exit(1);
}

console.log('✅ mapshaper is installed');
console.log('');

// Check which levels exist
const levels = [0, 1, 2];
const existingLevels = levels.filter(level => {
    const file = path.join(DATA_DIR, `gadm_level${level}.geojson`);
    return fs.existsSync(file);
});

if (existingLevels.length === 0) {
    console.error('❌ No GADM GeoJSON files found in:', DATA_DIR);
    console.error('');
    console.error('Expected files:');
    levels.forEach(level => {
        console.error(`  - gadm_level${level}.geojson`);
    });
    process.exit(1);
}

console.log(`📁 Found ${existingLevels.length} level(s) to optimize:`);
existingLevels.forEach(level => {
    const file = path.join(DATA_DIR, `gadm_level${level}.geojson`);
    const stats = fs.statSync(file);
    console.log(`   Level ${level}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
});

console.log('');
console.log('='.repeat(50));
console.log('');

// Optimize each level
let successCount = 0;
for (const level of existingLevels) {
    if (optimizeGeoJSON(level)) {
        successCount++;
    }
}

// Summary
console.log('');
console.log('='.repeat(50));
console.log('✅ Optimization Complete!');
console.log('');
console.log(`📊 Summary: ${successCount}/${existingLevels.length} files optimized`);
console.log('');
console.log('📁 Optimized files:');
for (const level of existingLevels) {
    const optimized = path.join(OUTPUT_DIR, `gadm_level${level}_optimized.geojson`);
    if (fs.existsSync(optimized)) {
        const stats = fs.statSync(optimized);
        console.log(`   Level ${level}: ${(stats.size / 1024 / 1024).toFixed(2)} MB (optimized)`);
    }
}
console.log('');


