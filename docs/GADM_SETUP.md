# GADM 數據設置指南

## 問題說明

應用需要 GADM (Global Administrative Areas) 數據文件才能顯示國家和行政區邊界。如果數據文件不存在，會出現 404 錯誤。

## 錯誤示例

```
GET http://localhost:8080/data/gadm/TWN/TWN_0.geojson 404 (File not found)
Error: Failed to load GADM data: TWN (404)
```

## 解決方案

### 方案 1: 從現有 GADM 文件提取（推薦）

如果已有 GADM 數據文件（在 `/Users/yulincho/Documents/01_Github/map/data/gadm/` 或其他位置），可以使用 Python 腳本提取：

```bash
# 提取台灣 (Level 0 - 國家級別)
python3 scripts/extract-country-from-optimized.py TWN 0

# 提取英國 (Level 0)
python3 scripts/extract-country-from-optimized.py GBR 0

# 提取 Level 1 (行政區級別，可選)
python3 scripts/extract-country-from-optimized.py TWN 1
```

**注意**: 
- Python 腳本支持大文件（使用標準 JSON 解析，或可選的 ijson 進行流式處理）
- 腳本會自動查找以下位置的數據文件：
  1. `/Users/yulincho/Documents/01_Github/map/data/gadm/gadm_level{level}.geojson`
  2. `../../map/data/gadm/gadm_level{level}.geojson`
  3. `../../hkn/data/gadm/optimized/gadm_level{level}_optimized.geojson`

**Node.js 腳本（僅適用於較小文件）**:
```bash
node scripts/extract-country-from-optimized.js TWN 0
```

### 方案 2: 下載並轉換 GADM 數據

1. **下載 GADM 數據**
   - 訪問 https://gadm.org/download_country.html
   - 選擇需要的國家（例如 Taiwan）
   - 下載 GeoPackage (.gpkg) 文件

2. **轉換為 GeoJSON 格式**

   使用 GDAL 工具（ogr2ogr）轉換：

   ```bash
   # 安裝 GDAL（如果未安裝）
   # macOS: brew install gdal
   
   # 轉換 Level 0 (國家級別)
   ogr2ogr -f GeoJSON data/gadm/TWN/TWN_0.geojson gadm_41_TWN.gpkg gadm_41_TWN_0
   
   # 轉換 Level 1 (行政區級別，可選)
   ogr2ogr -f GeoJSON data/gadm/TWN/TWN_1.geojson gadm_41_TWN.gpkg gadm_41_TWN_1
   ```

3. **文件結構**

   數據應該組織為：

   ```
   data/gadm/
   ├── TWN/
   │   ├── TWN_0.geojson  (國家級別)
   │   └── TWN_1.geojson  (行政區級別，可選)
   ├── GBR/
   │   ├── GBR_0.geojson
   │   └── GBR_1.geojson
   └── ...
   ```

### 方案 3: 使用預處理腳本（參考 hkn 項目）

hkn 項目可能有轉換腳本，可以參考使用。

## 文件命名規則

- **國家級別 (Level 0)**: `{ISO_CODE}_0.geojson`
  - 例如: `TWN_0.geojson`, `GBR_0.geojson`

- **行政區級別 (Level 1)**: `{ISO_CODE}_1.geojson`
  - 例如: `TWN_1.geojson`, `GBR_1.geojson`

- **GADM ID 格式**:
  - Level 0: `TWN` (只有國家代碼)
  - Level 1: `TWN.1` (國家代碼 + 第一個行政區 ID)
  - Level 2: `TWN.1.1` (國家代碼 + 兩個級別的 ID)

## 臨時解決方案（開發測試）

如果暫時無法獲取 GADM 數據，可以：

1. 創建一個空的 GeoJSON 文件作為占位符
2. 或者修改代碼以優雅地處理文件不存在的情況
3. 使用 Mapbox 的內建邊界數據作為替代

## 注意事項

- GADM 數據文件通常很大（每個國家幾 MB 到幾十 MB）
- 建議只下載需要的國家數據以節省空間
- 數據文件應放在 `data/gadm/` 目錄下
- 確保文件權限正確（可讀）

