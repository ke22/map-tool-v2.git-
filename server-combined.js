/**
 * Combined Server: Static File Server + Gemini API Proxy
 * 
 * This server combines:
 * 1. Static file serving (HTML, JS, CSS, GeoJSON, etc.)
 * 2. Gemini API proxy (secure backend for API calls)
 * 
 * Usage:
 *   1. Set GEMINI_API_KEY environment variable (in .env file or environment)
 *   2. node server-combined.js
 */

// Load environment variables from .env file
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, try manual .env loading
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                    process.env[key.trim()] = value;
                }
            }
        });
    }
}

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const readline = require('readline');
const StreamArray = require('stream-json/streamers/StreamArray');
const Pick = require('stream-json/filters/Pick');
const { chain } = require('stream-chain');

const PORT = process.env.PORT || 8001;
const PROXY_PATH = '/api/gemini/generateContent';
const GADM_API_PATH = '/api/gadm';

// GADM 數據緩存（內存緩存，避免重複處理大型文件）
const gadmCache = new Map(); // cacheKey -> { data, timestamp }
const MAX_CACHE_SIZE = 100; // 最多緩存 100 個結果
const CACHE_TTL = 3600000; // 緩存有效期：1 小時（毫秒）

// Get API configuration from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.geojson': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

/**
 * Convert client request format to Gemini API format
 * Client sends: {text: "...", options: {...}}
 * Gemini API expects: {contents: [{parts: [{text: "..."}]}]}
 */
function convertToGeminiFormat(clientRequest) {
    const { text, options = {} } = clientRequest;
    
    // Build Gemini API request format
    const geminiRequest = {
        contents: [{
            parts: [{
                text: text || ''
            }]
        }]
    };
    
    // Add generation config if provided in options
    if (options.generationConfig) {
        geminiRequest.generationConfig = options.generationConfig;
    }
    
    // Add safety settings if provided
    if (options.safetySettings) {
        geminiRequest.safetySettings = options.safetySettings;
    }
    
    return geminiRequest;
}

/**
 * Proxy Gemini API request
 */
function proxyGeminiRequest(req, res, requestBody) {
    if (!GEMINI_API_KEY) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Server configuration error: GEMINI_API_KEY not set',
            message: 'Please set GEMINI_API_KEY in .env file or environment variable'
        }));
        return;
    }

    try {
        // Parse client request
        const clientRequest = JSON.parse(requestBody);
        
        // Convert to Gemini API format
        const geminiRequestBody = convertToGeminiFormat(clientRequest);
        const geminiRequestBodyStr = JSON.stringify(geminiRequestBody);
        
        // Build Gemini API URL
        const apiUrl = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent`;
        const parsedUrl = url.parse(apiUrl);

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': GEMINI_API_KEY,
                'Content-Length': Buffer.byteLength(geminiRequestBodyStr)
            }
        };

        console.log(`🤖 Proxying Gemini API request to: ${apiUrl}`);

        const proxyReq = https.request(options, (proxyRes) => {
            // Forward status code
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });

            // Forward response
            proxyRes.on('data', (chunk) => {
                res.write(chunk);
            });

            proxyRes.on('end', () => {
                res.end();
                console.log(`✅ Gemini API response: ${proxyRes.statusCode}`);
            });
        });

        proxyReq.on('error', (error) => {
            console.error('❌ Proxy error:', error);
            res.writeHead(500, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                error: 'Proxy error',
                message: error.message
            }));
        });

        // Send request body
        proxyReq.write(geminiRequestBodyStr);
        proxyReq.end();
    } catch (error) {
        console.error('❌ Request parsing error:', error);
        res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            error: 'Invalid request format',
            message: error.message
        }));
    }
}

/**
 * Handle GADM data request (filtered by country code)
 * Endpoint: /api/gadm?gadmId=AZE&level=0
 */
function handleGADMRequest(req, res, parsedUrl) {
    const query = parsedUrl.query;
    const gadmId = query.gadmId || query.id;
    const level = parseInt(query.level) || 0;
    
    console.log(`🗺️ GADM API request: ${parsedUrl.pathname}`, { gadmId, level });
    
    if (!gadmId) {
        res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'gadmId parameter is required' }));
        return;
    }
    
    // 檢查緩存
    const cacheKey = `${gadmId}-${level}`;
    const cached = gadmCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`   ✅ Cache hit for ${gadmId} (saved ${Date.now() - cached.timestamp}ms)`);
        res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
            'X-Cache': 'HIT'
        });
        res.end(JSON.stringify(cached.data));
        return;
    }
    
    console.log(`   ⏳ Cache miss for ${gadmId}, processing...`);
    
    try {
        // 構建文件路徑（優先使用優化版本）
        const parts = gadmId.split('.');
        const countryCode = parts[0];
        
        // 暫時不支持 level 2
        if (level === 2) {
            console.warn(`   ⚠️  Level 2 (cities) is currently disabled`);
            res.writeHead(400, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ 
                error: 'Level 2 (cities) is currently not supported',
                message: 'Please use level 0 (countries) or level 1 (administrative areas)'
            }));
            return;
        }
        
        // 優先檢查分割後的國家文件（最快，直接讀取，無需流式處理）
        const splitCountryPath = path.join(__dirname, 'data', 'gadm', 'optimized', 'by_country', `${countryCode.toUpperCase()}.geojson`);
        const optimizedPath = path.join(__dirname, 'data', 'gadm', 'optimized', `gadm_level${level}_optimized.geojson`);
        const fallbackPath = path.join(__dirname, 'data', 'gadm', `gadm_level${level}.geojson`);
        
        let filePath = null;
        let isOptimized = false;
        let useSplitFile = false;
        
        // 優先使用分割後的國家文件（只適用於 level 0，因為 by_country 文件只包含 level 0 數據）
        // 注意：level 1 請求應該使用 gadm_level1_optimized.geojson 或流式處理大文件
        if (level === 0) {
            try {
                const stats = fs.statSync(splitCountryPath);
                filePath = splitCountryPath;
                useSplitFile = true;
                isOptimized = true;
                console.log(`   ⚡ Using split country file: ${countryCode.toUpperCase()}.geojson (${(stats.size / 1024).toFixed(2)} KB)`);
                
                // 直接讀取文件（無需流式處理）
                const fileContent = fs.readFileSync(splitCountryPath, 'utf8');
                const geojson = JSON.parse(fileContent);
                
                // Level 0 文件每個國家只有 1 個 feature（已合併），直接返回
                let result = geojson;
                
                // 緩存結果
                gadmCache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
                
                // 限制緩存大小
                if (gadmCache.size > MAX_CACHE_SIZE) {
                    const firstKey = gadmCache.keys().next().value;
                    gadmCache.delete(firstKey);
                }
                
                const jsonString = JSON.stringify(result);
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600',
                    'X-Cache': 'MISS',
                    'X-Source': 'split-file',
                    'Content-Length': Buffer.byteLength(jsonString, 'utf8')
                });
                res.end(jsonString);
                console.log(`   ✅ Response sent from split file (${(jsonString.length / 1024).toFixed(2)} KB)`);
                return;
            } catch (splitError) {
                // 分割文件不存在，繼續使用大文件
                console.log(`   ⚠️  Split country file not found, falling back to merged file`);
            }
        }
        
        // 檢查優化版本是否存在
        try {
            const stats = fs.statSync(optimizedPath);
            filePath = optimizedPath;
            isOptimized = true;
            console.log(`   ✅ Using optimized file: ${stats.size} bytes (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
        } catch (optimizedError) {
            // 優化版本不存在，使用原始文件
            console.log(`   ⚠️  Optimized file not found, using original file`);
            try {
                const stats = fs.statSync(fallbackPath);
                filePath = fallbackPath;
                isOptimized = false;
                console.log(`   📁 Using original file: ${stats.size} bytes (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
            } catch (fallbackError) {
                console.error(`   ❌ Neither optimized nor original file found`);
                console.error(`   Split file path: ${splitCountryPath}`);
                console.error(`   Optimized path: ${optimizedPath}`);
                console.error(`   Original path: ${fallbackPath}`);
                res.writeHead(404, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                    error: `GADM level ${level} file not found`,
                    splitCountryPath: splitCountryPath,
                    optimizedPath: optimizedPath,
                    originalPath: fallbackPath,
                    message: 'Neither split, optimized nor original file exists'
                }));
                return;
            }
        }
        
        // 使用 stream-json 流式解析大型 JSON 文件
        // 使用 Pick 選擇 features 數組，然後使用 StreamArray 逐個處理每個 feature
        console.log(`   Streaming GeoJSON file...`);
        
        const filteredFeatures = [];
        const upperCountryCode = countryCode.toUpperCase();
        let featureCount = 0;
        let startTime = Date.now();
        let responseSent = false; // 標記是否已發送響應
        
        // 設置超時（5分鐘，因為文件很大 955MB）
        const timeout = setTimeout(() => {
            console.error(`   ⚠️ GADM request timeout after 5 minutes for ${gadmId}`);
            console.error(`   Processed ${featureCount} features, found ${filteredFeatures.length} matches before timeout`);
            if (!res.headersSent && !responseSent) {
                res.writeHead(500, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                    error: 'Request timeout',
                    message: 'GADM data processing took too long. File is very large (955MB). Consider pre-splitting the file.',
                    processed: featureCount,
                    found: filteredFeatures.length
                }));
                responseSent = true;
            }
            pipeline.destroy();
        }, 300000); // 5 分鐘
        
        // 發送響應的輔助函數
        const sendResponse = (features) => {
            if (responseSent || res.headersSent) {
                return;
            }
            
            const result = {
                type: 'FeatureCollection',
                features: features
            };
            
            // 緩存結果
            gadmCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            // 限制緩存大小（LRU：移除最舊的緩存）
            if (gadmCache.size > MAX_CACHE_SIZE) {
                const firstKey = gadmCache.keys().next().value;
                gadmCache.delete(firstKey);
                console.log(`   🗑️ Cache evicted: ${firstKey} (cache size: ${gadmCache.size})`);
            }
            
            const jsonString = JSON.stringify(result);
            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
                'X-Cache': 'MISS',
                'Content-Length': Buffer.byteLength(jsonString, 'utf8')
            });
            res.end(jsonString);
            responseSent = true;
            console.log(`   ✅ Response sent successfully for ${gadmId} (${(jsonString.length / 1024 / 1024).toFixed(2)} MB)`);
        };
        
        // 創建流式解析管道
        // Pick 選擇 features 數組，StreamArray 逐個處理每個 feature
        const pipeline = chain([
            fs.createReadStream(filePath),
            Pick.withParser({ filter: 'features' }),  // 選擇 features 數組
            StreamArray.streamArray()  // 逐個處理 features 數組中的每個元素
        ]);
        
        pipeline.on('data', (data) => {
            // StreamArray 會逐個處理 features 數組中的每個 feature
            const feature = data.value;
            featureCount++;
            
            // 每 50000 個 feature 才輸出一次進度日誌（減少日誌輸出，提升性能）
            if (featureCount % 50000 === 0) {
                const elapsed = Date.now() - startTime;
                const rate = featureCount / (elapsed / 1000); // features per second
                console.log(`   ⏳ Processing... ${featureCount.toLocaleString()} features scanned (${rate.toFixed(0)} features/sec)`);
            }
            
            if (feature && feature.properties) {
                const gid0 = feature.properties.GID_0 || feature.properties.gid_0 || '';
                const gid0Str = String(gid0).toUpperCase();
                const gid0Country = gid0Str ? gid0Str.split('.')[0] : '';
                
                // 匹配完整的國家代碼或以其開頭的 GID（例如 AZE 或 AZE.1）
                if (gid0Country === upperCountryCode || gid0Str.startsWith(upperCountryCode + '.')) {
                    filteredFeatures.push(feature);
                    // 只在找到前 3 個匹配時才輸出詳細日誌
                    if (filteredFeatures.length <= 3) {
                        console.log(`   ✓ Matched feature ${featureCount.toLocaleString()}: GID_0=${gid0}`);
                    } else if (filteredFeatures.length === 4) {
                        console.log(`   ✓ Found ${filteredFeatures.length} matches so far, continuing...`);
                    }
                    
                    // 優化：對於 level 0（國家級別），找到第一個匹配後可以提前停止
                    // 大多數國家只有一個 feature，提前停止可以大幅提升性能（從 30 秒減少到 1-5 秒）
                    // 某些國家（如島嶼國家）可能有多個部分，但通常第一個 feature 就包含了主要邊界
                    if (level === 0 && filteredFeatures.length === 1 && !responseSent) {
                        const elapsed = Date.now() - startTime;
                        console.log(`   ⚡ Early stop: Found match at feature ${featureCount.toLocaleString()} (took ${elapsed}ms)`);
                        console.log(`   ⚡ Sending response immediately (saved ~${30000 - elapsed}ms)`);
                        
                        // 立即發送響應
                        sendResponse(filteredFeatures);
                        
                        // 停止管道處理
                        pipeline.destroy();
                        clearTimeout(timeout);
                        return;
                    }
                    
                    // 對於 level 1（行政區級別），可能需要多個 features，繼續處理
                    // 但如果在找到 10 個匹配後仍然沒有發送響應，也可以考慮提前停止
                    if (level === 1 && filteredFeatures.length >= 10 && !responseSent) {
                        const elapsed = Date.now() - startTime;
                        console.log(`   ⚡ Early stop for level 1: Found ${filteredFeatures.length} matches (took ${elapsed}ms)`);
                        sendResponse(filteredFeatures);
                        pipeline.destroy();
                        clearTimeout(timeout);
                        return;
                    }
                }
            }
        });
        
        pipeline.on('end', () => {
            clearTimeout(timeout);
            const elapsed = Date.now() - startTime;
            console.log(`   Processed ${featureCount} features, filtered ${filteredFeatures.length} matches (took ${elapsed}ms)`);
            
            // 如果已經提前發送響應，跳過
            if (responseSent || res.headersSent) {
                console.log(`   Response already sent (early stop), skipping end handler`);
                return;
            }
            
            if (filteredFeatures.length === 0) {
                console.warn(`   No matching features found for GADM ID: ${gadmId}`);
                res.writeHead(404, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ error: `No matching features found for GADM ID: ${gadmId}` }));
                return;
            }
            
            // 如果還沒有發送響應，現在發送（正常流程）
            sendResponse(filteredFeatures);
        });
        
        pipeline.on('error', (error) => {
            clearTimeout(timeout);
            console.error(`   ❌ Error streaming GeoJSON file:`, error);
            if (!res.headersSent && !responseSent) {
                res.writeHead(500, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                    error: 'Failed to parse GADM file', 
                    message: error.message 
                }));
                responseSent = true;
            }
        });
        
    } catch (error) {
        console.error('GADM request error:', error);
        res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Server error', message: error.message }));
    }
}

/**
 * Handle Gemini proxy request
 */
function handleGeminiProxy(req, res) {
    let body = '';

    req.on('data', (chunk) => {
        body += chunk.toString();
    });

    req.on('end', () => {
        if (!body) {
            res.writeHead(400, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({
                error: 'Request body is required'
            }));
            return;
        }

        proxyGeminiRequest(req, res, body);
    });

    req.on('error', (error) => {
        console.error('❌ Request error:', error);
        res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            error: 'Request error',
            message: error.message
        }));
    });
}

// Create combined server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Debug: Log all requests
    console.log(`📥 ${req.method} ${parsedUrl.pathname}`, parsedUrl.query);

    // Add CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS request (CORS preflight)
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Handle Gemini API proxy
    if (parsedUrl.pathname === PROXY_PATH) {
        if (req.method === 'POST') {
            handleGeminiProxy(req, res);
            return;
        }
        
        // Other methods not allowed
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    // Handle GADM API request
    console.log(`   Checking GADM route: pathname="${parsedUrl.pathname}", GADM_API_PATH="${GADM_API_PATH}", startsWith=${parsedUrl.pathname.startsWith(GADM_API_PATH)}`);
    if (parsedUrl.pathname.startsWith(GADM_API_PATH)) {
        console.log(`🗺️ GADM API route matched: ${parsedUrl.pathname} (starts with ${GADM_API_PATH})`);
        if (req.method === 'GET') {
            console.log(`   Calling handleGADMRequest...`);
            handleGADMRequest(req, res, parsedUrl);
            return;
        }
        
        console.log(`   Method not allowed: ${req.method}`);
        // Other methods not allowed
        res.writeHead(405, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    // Handle static file serving
    const urlPath = parsedUrl.pathname;
    let filePath = '.' + urlPath;
    
    // Default to index.html if root
    if (filePath === './' || filePath === '.') {
        filePath = './index.html';
    }
    
    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    let contentType = mimeTypes[extname] || 'application/octet-stream';

    // Check if file exists
    fs.stat(filePath, (statError, stats) => {
        if (statError) {
            if (statError.code === 'ENOENT') {
                // File not found
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`
                    <h1>404 - File Not Found</h1>
                    <p>Requested: ${req.url}</p>
                    <p>Make sure the file exists at: ${filePath}</p>
                `, 'utf-8');
            } else {
                // Server error
                res.writeHead(500);
                res.end('Server Error: ' + statError.code + ' ..\n');
            }
            return;
        }

        // For large files (> 50MB), use streaming
        // For HTML files, we need to read fully to inject Mapbox token
        const isLargeFile = stats.size > 50 * 1024 * 1024; // 50MB
        const isHtmlFile = filePath.endsWith('.html');

        if (isLargeFile && !isHtmlFile) {
            // Stream large files (GeoJSON, etc.)
            const fileStream = fs.createReadStream(filePath);
            
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Content-Length': stats.size,
                'Cache-Control': 'public, max-age=3600'
            });
            
            fileStream.on('error', (streamError) => {
                console.error('File stream error:', streamError);
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end('Server Error: ' + streamError.code + ' ..\n');
                } else {
                    res.end();
                }
            });
            
            fileStream.pipe(res);
        } else {
            // Read small files or HTML files fully (for token injection)
            fs.readFile(filePath, (error, content) => {
                if (error) {
                    res.writeHead(500);
                    res.end('Server Error: ' + error.code + ' ..\n');
                    return;
                }

                // Inject Mapbox token into HTML files if MAPBOX_TOKEN is set
                let finalContent = content;
                const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
                
                // Skip injection if token is a placeholder
                const isPlaceholder = MAPBOX_TOKEN && (
                    MAPBOX_TOKEN.includes('your-mapbox-token') ||
                    MAPBOX_TOKEN.includes('your-token') ||
                    MAPBOX_TOKEN === 'your-mapbox-token-here' ||
                    MAPBOX_TOKEN.trim() === ''
                );
                
                if (MAPBOX_TOKEN && !isPlaceholder && filePath.endsWith('.html')) {
                    // Inject script tag before config.js script tag
                    const injectionScript = `    <!-- Injected Mapbox Token from environment variable -->
    <script>
        window.MAPBOX_TOKEN = '${MAPBOX_TOKEN.replace(/'/g, "\\'")}';
    </script>
`;
                    
                    const htmlContent = content.toString('utf-8');
                    // Inject before config.js script tag
                    if (htmlContent.includes('config.js')) {
                        finalContent = htmlContent.replace(
                            /(\s*)(<script[^>]*src=["']config\.js["'][^>]*>)/,
                            injectionScript + '$1$2'
                        );
                    } else if (htmlContent.includes('</head>')) {
                        // Fallback: inject before </head>
                        finalContent = htmlContent.replace('</head>', injectionScript + '    </head>');
                    } else {
                        // Last resort: inject at the beginning of body
                        finalContent = htmlContent.replace('<body', injectionScript + '<body');
                    }
                    finalContent = Buffer.from(finalContent, 'utf-8');
                }
                
                // Success
                res.writeHead(200, { 
                    'Content-Type': contentType,
                    'Content-Length': finalContent.length,
                    'Cache-Control': 'public, max-age=3600'
                });
                res.end(finalContent, 'utf-8');
            });
        }
    });
});

// Start server
server.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 Combined Server Running!');
    console.log('='.repeat(50));
    console.log('');
    console.log(`📍 Server: http://localhost:${PORT}/`);
    console.log('');
    console.log('📁 Static Files:');
    console.log(`   Main: http://localhost:${PORT}/index.html`);
    console.log('');
    console.log('🔒 Gemini API Proxy:');
    console.log(`   Endpoint: http://localhost:${PORT}${PROXY_PATH}`);
    
    if (GEMINI_API_KEY) {
        console.log('   ✅ API Key: Set (hidden)');
    } else {
        console.log('   ⚠️  API Key: Not set!');
        console.log('   Set GEMINI_API_KEY environment variable to enable proxy.');
    }
    
    console.log(`   📝 Model: ${GEMINI_MODEL}`);
    console.log(`   🌐 Base URL: ${GEMINI_BASE_URL}`);
    
    // Check Mapbox token
    const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
    if (MAPBOX_TOKEN) {
        console.log('');
        console.log('🗺️  Mapbox:');
        console.log('   ✅ Mapbox Token: Set (hidden)');
    }
    
    console.log('');
    console.log('⏹️  Stop server: Press Ctrl+C');
    console.log('='.repeat(50));
});

