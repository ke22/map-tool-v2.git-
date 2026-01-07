/**
 * Split GADM GeoJSON file by country
 * 
 * This script splits a large GADM GeoJSON file into individual country files.
 * Each country gets its own file: data/gadm/optimized/by_country/{ISO_CODE}.geojson
 * 
 * Usage:
 *   node scripts/split-gadm-by-country.js [level]
 * 
 * Example:
 *   node scripts/split-gadm-by-country.js 0  # Split level 0 (countries)
 *   node scripts/split-gadm-by-country.js 1  # Split level 1 (administrative areas)
 */

const fs = require('fs');
const path = require('path');
const { chain } = require('stream-chain');
const Pick = require('stream-json/filters/Pick');
const StreamArray = require('stream-json/streamers/StreamArray');

const DATA_DIR = path.join(__dirname, '..', 'data', 'gadm');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'gadm', 'optimized', 'by_country');

// Get level from command line argument
const level = parseInt(process.argv[2]) || 0;
const inputFile = path.join(DATA_DIR, 'optimized', `gadm_level${level}_optimized.geojson`);
const fallbackFile = path.join(DATA_DIR, `gadm_level${level}.geojson`);

// Determine which file to use
let filePath = null;
if (fs.existsSync(inputFile)) {
    filePath = inputFile;
    console.log(`✅ Using optimized file: ${inputFile}`);
} else if (fs.existsSync(fallbackFile)) {
    filePath = fallbackFile;
    console.log(`⚠️  Using original file: ${fallbackFile}`);
} else {
    console.error(`❌ Neither optimized nor original file found for level ${level}`);
    process.exit(1);
}

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Created output directory: ${OUTPUT_DIR}`);
}

console.log(`\n🔄 Splitting GADM Level ${level} file by country...`);
console.log(`   Input: ${filePath}`);
console.log(`   Output: ${OUTPUT_DIR}/`);
console.log('');

// Track countries and their features
const countryFeatures = new Map(); // ISO code -> features array
let totalFeatures = 0;
let startTime = Date.now();

// Create streaming pipeline
const pipeline = chain([
    fs.createReadStream(filePath),
    Pick.withParser({ filter: 'features' }),
    StreamArray.streamArray()
]);

pipeline.on('data', (data) => {
    const feature = data.value;
    totalFeatures++;
    
    if (feature && feature.properties) {
        // Get country code from GID_0
        const gid0 = feature.properties.GID_0 || feature.properties.gid_0 || '';
        const countryCode = String(gid0).toUpperCase().split('.')[0];
        
        if (countryCode && countryCode.length >= 2) {
            if (!countryFeatures.has(countryCode)) {
                countryFeatures.set(countryCode, []);
            }
            countryFeatures.get(countryCode).push(feature);
            
            // Progress update every 50 features
            if (totalFeatures % 50 === 0) {
                console.log(`   Processed ${totalFeatures} features, found ${countryFeatures.size} countries...`);
            }
        }
    }
});

pipeline.on('end', () => {
    const elapsed = Date.now() - startTime;
    console.log(`\n✅ Processing complete!`);
    console.log(`   Total features: ${totalFeatures}`);
    console.log(`   Countries found: ${countryFeatures.size}`);
    console.log(`   Time taken: ${(elapsed / 1000).toFixed(2)}s`);
    console.log('');
    
    // Write individual country files
    console.log('📝 Writing country files...');
    let successCount = 0;
    let totalSize = 0;
    
    for (const [countryCode, features] of countryFeatures) {
        const outputFile = path.join(OUTPUT_DIR, `${countryCode}.geojson`);
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
        
        const jsonString = JSON.stringify(geojson);
        fs.writeFileSync(outputFile, jsonString, 'utf8');
        
        const fileSize = fs.statSync(outputFile).size;
        totalSize += fileSize;
        successCount++;
        
        if (successCount <= 10 || successCount % 20 === 0) {
            console.log(`   ${countryCode}: ${features.length} feature(s), ${(fileSize / 1024).toFixed(2)} KB`);
        }
    }
    
    console.log('');
    console.log('='.repeat(50));
    console.log('✅ Split Complete!');
    console.log('');
    console.log(`📊 Summary:`);
    console.log(`   Countries processed: ${successCount}`);
    console.log(`   Total output size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Average file size: ${(totalSize / successCount / 1024).toFixed(2)} KB`);
    console.log('');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log('');
    console.log('💡 Usage:');
    console.log(`   Update server-combined.js to use: /api/gadm/by_country/{ISO_CODE}.geojson`);
    console.log('');
});

pipeline.on('error', (error) => {
    console.error('❌ Error processing file:', error);
    process.exit(1);
});


