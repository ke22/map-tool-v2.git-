#!/usr/bin/env python3
"""
從 GADM 文件中提取單個國家的數據（支持大文件流式處理）

用法:
    python3 scripts/extract-country-from-optimized.py TWN 0
    python3 scripts/extract-country-from-optimized.py GBR 0
"""

import json
import sys
import os
from pathlib import Path

def find_source_file(level):
    """查找源數據文件"""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    possible_paths = [
        project_root / 'map' / 'data' / 'gadm' / f'gadm_level{level}.geojson',
        project_root / 'hkn' / 'data' / 'gadm' / 'optimized' / f'gadm_level{level}_optimized.geojson',
        Path('/Users/yulincho/Documents/01_Github/map/data/gadm/gadm_level{level}.geojson'.format(level=level))
    ]
    
    for path in possible_paths:
        if path.exists():
            return path
    
    return None

def extract_country_streaming(source_file, country_code, target_file):
    """使用流式處理提取國家數據（適用於大文件）"""
    print(f"正在從 {source_file} 提取 {country_code}...")
    print(f"（使用流式處理以處理大文件）")
    
    features_found = 0
    features_written = 0
    
    # 使用 ijson 進行流式處理（如果可用），否則使用標準方法
    try:
        import ijson
        use_ijson = True
    except ImportError:
        use_ijson = False
        print("提示: 安裝 ijson 可以更快處理大文件: pip install ijson")
    
    if use_ijson:
        # 使用 ijson 流式處理
        with open(source_file, 'rb') as f, open(target_file, 'w', encoding='utf-8') as out:
            out.write('{"type":"FeatureCollection","features":[')
            first = True
            
            parser = ijson.items(f, 'features.item')
            for feature in parser:
                features_found += 1
                props = feature.get('properties', {})
                gid0 = props.get('GID_0') or props.get('ISO') or props.get('COUNTRY_CODE')
                
                if gid0 == country_code:
                    if not first:
                        out.write(',')
                    json.dump(feature, out, ensure_ascii=False)
                    features_written += 1
                    first = False
                    if features_written % 10 == 0:
                        print(f"  已提取 {features_written} 個要素...", end='\r')
            
            out.write(']}')
    else:
        # 標準方法：分塊讀取（對於超大文件可能仍會失敗）
        print("使用標準 JSON 解析（文件較大時可能需要較長時間）...")
        with open(source_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        features = data.get('features', [])
        print(f"總共找到 {len(features)} 個要素，正在過濾...")
        
        filtered_features = []
        for feature in features:
            props = feature.get('properties', {})
            gid0 = props.get('GID_0') or props.get('ISO') or props.get('COUNTRY_CODE')
            if gid0 == country_code:
                filtered_features.append(feature)
            features_found += 1
            if features_found % 1000 == 0:
                print(f"  已處理 {features_found}/{len(features)} 個要素...", end='\r')
        
        features_written = len(filtered_features)
        country_data = {
            'type': 'FeatureCollection',
            'features': filtered_features
        }
        
        with open(target_file, 'w', encoding='utf-8') as out:
            json.dump(country_data, out, ensure_ascii=False, indent=2)
    
    return features_written

def main():
    if len(sys.argv) < 2:
        print("用法: python3 scripts/extract-country-from-optimized.py <COUNTRY_CODE> [LEVEL]")
        print("例如: python3 scripts/extract-country-from-optimized.py TWN 0")
        sys.exit(1)
    
    country_code = sys.argv[1].upper()
    level = sys.argv[2] if len(sys.argv) > 2 else '0'
    
    # 查找源文件
    source_file = find_source_file(level)
    if not source_file:
        print("錯誤: 找不到源數據文件")
        print("檢查的路徑:")
        script_dir = Path(__file__).parent
        project_root = script_dir.parent
        print(f"  1. {project_root / 'map' / 'data' / 'gadm' / f'gadm_level{level}.geojson'}")
        print(f"  2. {project_root / 'hkn' / 'data' / 'gadm' / 'optimized' / f'gadm_level{level}_optimized.geojson'}")
        print(f"  3. /Users/yulincho/Documents/01_Github/map/data/gadm/gadm_level{level}.geojson")
        sys.exit(1)
    
    # 創建目標目錄和文件
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    target_dir = project_root / 'data' / 'gadm' / country_code
    target_file = target_dir / f'{country_code}_{level}.geojson'
    
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # 提取數據
    try:
        features_count = extract_country_streaming(source_file, country_code, target_file)
        
        if features_count == 0:
            print(f"\n警告: 在源文件中未找到 {country_code} 的數據")
            # 顯示一些可用的國家代碼
            print("\n嘗試讀取前幾個要素以顯示可用的國家代碼...")
            try:
                with open(source_file, 'r', encoding='utf-8') as f:
                    # 只讀取開頭部分來獲取樣本
                    sample = f.read(50000)  # 讀取前 50KB
                    if '"GID_0"' in sample or '"ISO"' in sample:
                        print("（文件太大，無法快速顯示所有國家代碼）")
            except:
                pass
            sys.exit(1)
        
        file_size = os.path.getsize(target_file)
        print(f"\n✅ 成功提取 {features_count} 個要素到 {target_file}")
        print(f"   文件大小: {file_size / 1024 / 1024:.2f} MB")
        
    except Exception as e:
        print(f"\n錯誤: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()




