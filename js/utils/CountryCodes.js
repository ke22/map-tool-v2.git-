/**
 * Country Code Mapping - 國家代碼映射
 * 
 * ISO 3166-1 alpha-3 代碼與中文/英文名稱的映射
 * 用於地名解析和顯示
 */

/**
 * 國家代碼映射表
 * 格式：{ 'ISO_CODE': { name: '中文名稱', nameEn: 'English Name' } }
 */
const COUNTRY_CODES = {
  'AFG': { name: '阿富汗', nameEn: 'Afghanistan' },
  'ALA': { name: '亞蘭群島', nameEn: 'Aland Islands' },
  'ALB': { name: '阿爾巴尼亞', nameEn: 'Albania' },
  'DZA': { name: '阿爾及利亞', nameEn: 'Algeria' },
  'ASM': { name: '薩摩亞', nameEn: 'American Samoa' },
  'AND': { name: '安道爾', nameEn: 'Andorra' },
  'AGO': { name: '安哥拉', nameEn: 'Angola' },
  'AIA': { name: '安吉拉', nameEn: 'Anguilla' },
  'ATA': { name: '南極洲', nameEn: 'Antarctica' },
  'ATG': { name: '安地卡及巴布達', nameEn: 'Antigua and Barbuda' },
  'ARG': { name: '阿根廷', nameEn: 'Argentina' },
  'ARM': { name: '亞美尼亞', nameEn: 'Armenia' },
  'ABW': { name: '阿魯巴', nameEn: 'Aruba' },
  'AUS': { name: '澳洲', nameEn: 'Australia' },
  'AUT': { name: '奧地利', nameEn: 'Austria' },
  'AZE': { name: '亞塞拜然', nameEn: 'Azerbaijan' },
  'BHS': { name: '巴哈馬', nameEn: 'Bahamas' },
  'BHR': { name: '巴林', nameEn: 'Bahrain' },
  'BGD': { name: '孟加拉', nameEn: 'Bangladesh' },
  'BRB': { name: '巴貝多', nameEn: 'Barbados' },
  'BLR': { name: '白俄羅斯', nameEn: 'Belarus' },
  'BEL': { name: '比利時', nameEn: 'Belgium' },
  'BLZ': { name: '貝里斯', nameEn: 'Belize' },
  'BEN': { name: '貝南', nameEn: 'Benin' },
  'BMU': { name: '百慕達', nameEn: 'Bermuda' },
  'BTN': { name: '不丹', nameEn: 'Bhutan' },
  'BOL': { name: '玻利維亞', nameEn: 'Bolivia' },
  'BES': { name: '波奈、聖佑達修斯與沙巴', nameEn: 'Bonaire, Sint Eustatius and Saba' },
  'BIH': { name: '波士尼亞與赫塞哥維納', nameEn: 'Bosnia and Herzegovina' },
  'BWA': { name: '波札那', nameEn: 'Botswana' },
  'BVT': { name: '布威島', nameEn: 'Bouvet Island' },
  'BRA': { name: '巴西', nameEn: 'Brazil' },
  'IOT': { name: '英屬印度洋領地', nameEn: 'British Indian Ocean Territory' },
  'BRN': { name: '汶萊', nameEn: 'Brunei Darussalam' },
  'BGR': { name: '保加利亞', nameEn: 'Bulgaria' },
  'BFA': { name: '布吉納法索', nameEn: 'Burkina Faso' },
  'BDI': { name: '蒲隆地', nameEn: 'Burundi' },
  'CPV': { name: '維德角', nameEn: 'Cabo Verde' },
  'KHM': { name: '柬埔寨', nameEn: 'Cambodia' },
  'CMR': { name: '喀麥隆', nameEn: 'Cameroon' },
  'CAN': { name: '加拿大', nameEn: 'Canada' },
  'CYM': { name: '開曼群島', nameEn: 'Cayman Islands' },
  'CAF': { name: '中非', nameEn: 'Central African Republic' },
  'TCD': { name: '查德', nameEn: 'Chad' },
  'CHL': { name: '智利', nameEn: 'Chile' },
  'CHN': { name: '中國', nameEn: 'China' },
  'CXR': { name: '聖誕島', nameEn: 'Christmas Island' },
  'CCK': { name: '科克斯（基靈）群島', nameEn: 'Cocos (Keeling) Islands' },
  'COL': { name: '哥倫比亞', nameEn: 'Colombia' },
  'COM': { name: '葛摩', nameEn: 'Comoros' },
  'COG': { name: '剛果共和國', nameEn: 'Congo' },
  'COD': { name: '剛果民主共和國', nameEn: 'Congo (Democratic Republic of the)' },
  'COK': { name: '庫克群島', nameEn: 'Cook Islands' },
  'CRI': { name: '哥斯大黎加', nameEn: 'Costa Rica' },
  'CIV': { name: '象牙海岸', nameEn: 'Côte d\'Ivoire' },
  'HRV': { name: '克羅埃西亞', nameEn: 'Croatia' },
  'CUB': { name: '古巴', nameEn: 'Cuba' },
  'CUW': { name: '古拉索', nameEn: 'Curaçao' },
  'CYP': { name: '賽普勒斯', nameEn: 'Cyprus' },
  'CZE': { name: '捷克', nameEn: 'Czechia' },
  'DNK': { name: '丹麥', nameEn: 'Denmark' },
  'DJI': { name: '吉布地', nameEn: 'Djibouti' },
  'DMA': { name: '多米尼克', nameEn: 'Dominica' },
  'DOM': { name: '多明尼加', nameEn: 'Dominican Republic' },
  'ECU': { name: '厄瓜多', nameEn: 'Ecuador' },
  'EGY': { name: '埃及', nameEn: 'Egypt' },
  'SLV': { name: '薩爾瓦多', nameEn: 'El Salvador' },
  'GNQ': { name: '赤道幾內亞', nameEn: 'Equatorial Guinea' },
  'ERI': { name: '厄利垂亞', nameEn: 'Eritrea' },
  'EST': { name: '愛沙尼亞', nameEn: 'Estonia' },
  'SWZ': { name: '史瓦帝尼', nameEn: 'Eswatini' },
  'ETH': { name: '衣索比亞', nameEn: 'Ethiopia' },
  'FLK': { name: '福克蘭群島', nameEn: 'Falkland Islands' },
  'FRO': { name: '法羅群島', nameEn: 'Faroe Islands' },
  'FJI': { name: '斐濟', nameEn: 'Fiji' },
  'FIN': { name: '芬蘭', nameEn: 'Finland' },
  'FRA': { name: '法國', nameEn: 'France' },
  'GUF': { name: '法屬圭亞那', nameEn: 'French Guiana' },
  'PYF': { name: '法屬玻里尼西亞', nameEn: 'French Polynesia' },
  'ATF': { name: '法屬南部領地', nameEn: 'French Southern Territories' },
  'GAB': { name: '加彭', nameEn: 'Gabon' },
  'GMB': { name: '甘比亞', nameEn: 'Gambia' },
  'GEO': { name: '喬治亞', nameEn: 'Georgia' },
  'DEU': { name: '德國', nameEn: 'Germany' },
  'GHA': { name: '迦納', nameEn: 'Ghana' },
  'GIB': { name: '直布羅陀', nameEn: 'Gibraltar' },
  'GRC': { name: '希臘', nameEn: 'Greece' },
  'GRL': { name: '格陵蘭', nameEn: 'Greenland' },
  'GRD': { name: '格瑞那達', nameEn: 'Grenada' },
  'GLP': { name: '瓜地洛普', nameEn: 'Guadeloupe' },
  'GUM': { name: '關島', nameEn: 'Guam' },
  'GTM': { name: '瓜地馬拉', nameEn: 'Guatemala' },
  'GGY': { name: '根西', nameEn: 'Guernsey' },
  'GIN': { name: '幾內亞', nameEn: 'Guinea' },
  'GNB': { name: '幾內亞比索', nameEn: 'Guinea-Bissau' },
  'GUY': { name: '蓋亞那', nameEn: 'Guyana' },
  'HTI': { name: '海地', nameEn: 'Haiti' },
  'HMD': { name: '赫德島和麥當勞群島', nameEn: 'Heard Island and McDonald Islands' },
  'VAT': { name: '梵蒂岡', nameEn: 'Holy See' },
  'HND': { name: '宏都拉斯', nameEn: 'Honduras' },
  'HKG': { name: '香港', nameEn: 'Hong Kong' },
  'HUN': { name: '匈牙利', nameEn: 'Hungary' },
  'ISL': { name: '冰島', nameEn: 'Iceland' },
  'IND': { name: '印度', nameEn: 'India' },
  'IDN': { name: '印尼', nameEn: 'Indonesia' },
  'IRN': { name: '伊朗', nameEn: 'Iran' },
  'IRQ': { name: '伊拉克', nameEn: 'Iraq' },
  'IRL': { name: '愛爾蘭', nameEn: 'Ireland' },
  'IMN': { name: '曼島', nameEn: 'Isle of Man' },
  'ISR': { name: '以色列', nameEn: 'Israel' },
  'ITA': { name: '義大利', nameEn: 'Italy' },
  'JAM': { name: '牙買加', nameEn: 'Jamaica' },
  'JPN': { name: '日本', nameEn: 'Japan' },
  'JEY': { name: '澤西', nameEn: 'Jersey' },
  'JOR': { name: '約旦', nameEn: 'Jordan' },
  'KAZ': { name: '哈薩克', nameEn: 'Kazakhstan' },
  'KEN': { name: '肯亞', nameEn: 'Kenya' },
  'KIR': { name: '吉里巴斯', nameEn: 'Kiribati' },
  'PRK': { name: '北韓', nameEn: 'Korea (Democratic People\'s Republic of)' },
  'KOR': { name: '南韓', nameEn: 'Korea (Republic of)' },
  'KWT': { name: '科威特', nameEn: 'Kuwait' },
  'KGZ': { name: '吉爾吉斯', nameEn: 'Kyrgyzstan' },
  'LAO': { name: '寮國', nameEn: 'Lao People\'s Democratic Republic' },
  'LVA': { name: '拉脫維亞', nameEn: 'Latvia' },
  'LBN': { name: '黎巴嫩', nameEn: 'Lebanon' },
  'LSO': { name: '賴索托', nameEn: 'Lesotho' },
  'LBR': { name: '賴比瑞亞', nameEn: 'Liberia' },
  'LBY': { name: '利比亞', nameEn: 'Libya' },
  'LIE': { name: '列支敦斯登', nameEn: 'Liechtenstein' },
  'LTU': { name: '立陶宛', nameEn: 'Lithuania' },
  'LUX': { name: '盧森堡', nameEn: 'Luxembourg' },
  'MAC': { name: '澳門', nameEn: 'Macao' },
  'MDG': { name: '馬達加斯加', nameEn: 'Madagascar' },
  'MWI': { name: '馬拉威', nameEn: 'Malawi' },
  'MYS': { name: '馬來西亞', nameEn: 'Malaysia' },
  'MDV': { name: '馬爾地夫', nameEn: 'Maldives' },
  'MLI': { name: '馬利', nameEn: 'Mali' },
  'MLT': { name: '馬爾他', nameEn: 'Malta' },
  'MHL': { name: '馬紹爾群島', nameEn: 'Marshall Islands' },
  'MTQ': { name: '馬丁尼克', nameEn: 'Martinique' },
  'MRT': { name: '茅利塔尼亞', nameEn: 'Mauritania' },
  'MUS': { name: '模里西斯', nameEn: 'Mauritius' },
  'MYT': { name: '馬約特', nameEn: 'Mayotte' },
  'MEX': { name: '墨西哥', nameEn: 'Mexico' },
  'FSM': { name: '密克羅尼西亞', nameEn: 'Micronesia' },
  'MDA': { name: '摩爾多瓦', nameEn: 'Moldova' },
  'MCO': { name: '摩納哥', nameEn: 'Monaco' },
  'MNG': { name: '蒙古', nameEn: 'Mongolia' },
  'MNE': { name: '蒙特內哥羅', nameEn: 'Montenegro' },
  'MSR': { name: '蒙哲臘', nameEn: 'Montserrat' },
  'MAR': { name: '摩洛哥', nameEn: 'Morocco' },
  'MOZ': { name: '莫三比克', nameEn: 'Mozambique' },
  'MMR': { name: '緬甸', nameEn: 'Myanmar' },
  'NAM': { name: '納米比亞', nameEn: 'Namibia' },
  'NRU': { name: '諾魯', nameEn: 'Nauru' },
  'NPL': { name: '尼泊爾', nameEn: 'Nepal' },
  'NLD': { name: '荷蘭', nameEn: 'Netherlands' },
  'NCL': { name: '新喀里多尼亞', nameEn: 'New Caledonia' },
  'NZL': { name: '紐西蘭', nameEn: 'New Zealand' },
  'NIC': { name: '尼加拉瓜', nameEn: 'Nicaragua' },
  'NER': { name: '尼日', nameEn: 'Niger' },
  'NGA': { name: '奈及利亞', nameEn: 'Nigeria' },
  'NIU': { name: '紐埃', nameEn: 'Niue' },
  'NFK': { name: '諾福克島', nameEn: 'Norfolk Island' },
  'MKD': { name: '北馬其頓', nameEn: 'North Macedonia' },
  'MNP': { name: '北馬里亞納群島', nameEn: 'Northern Mariana Islands' },
  'NOR': { name: '挪威', nameEn: 'Norway' },
  'OMN': { name: '阿曼', nameEn: 'Oman' },
  'PAK': { name: '巴基斯坦', nameEn: 'Pakistan' },
  'PLW': { name: '帛琉', nameEn: 'Palau' },
  'PSE': { name: '巴勒斯坦', nameEn: 'Palestine, State of' },
  'PAN': { name: '巴拿馬', nameEn: 'Panama' },
  'PNG': { name: '巴布亞紐幾內亞', nameEn: 'Papua New Guinea' },
  'PRY': { name: '巴拉圭', nameEn: 'Paraguay' },
  'PER': { name: '秘魯', nameEn: 'Peru' },
  'PHL': { name: '菲律賓', nameEn: 'Philippines' },
  'PCN': { name: '皮特肯群島', nameEn: 'Pitcairn' },
  'POL': { name: '波蘭', nameEn: 'Poland' },
  'PRT': { name: '葡萄牙', nameEn: 'Portugal' },
  'PRI': { name: '波多黎各', nameEn: 'Puerto Rico' },
  'QAT': { name: '卡達', nameEn: 'Qatar' },
  'REU': { name: '留尼旺', nameEn: 'Réunion' },
  'ROU': { name: '羅馬尼亞', nameEn: 'Romania' },
  'RUS': { name: '俄羅斯', nameEn: 'Russian Federation' },
  'RWA': { name: '盧安達', nameEn: 'Rwanda' },
  'BLM': { name: '聖巴瑟米', nameEn: 'Saint Barthélemy' },
  'SHN': { name: '聖赫勒拿', nameEn: 'Saint Helena, Ascension and Tristan da Cunha' },
  'KNA': { name: '聖克里斯多福及尼維斯', nameEn: 'Saint Kitts and Nevis' },
  'LCA': { name: '聖露西亞', nameEn: 'Saint Lucia' },
  'MAF': { name: '法屬聖馬丁', nameEn: 'Saint Martin (French part)' },
  'SPM': { name: '聖皮耶與密克隆', nameEn: 'Saint Pierre and Miquelon' },
  'VCT': { name: '聖文森及格瑞那丁', nameEn: 'Saint Vincent and the Grenadines' },
  'WSM': { name: '薩摩亞', nameEn: 'Samoa' },
  'SMR': { name: '聖馬利諾', nameEn: 'San Marino' },
  'STP': { name: '聖多美普林西比', nameEn: 'Sao Tome and Principe' },
  'SAU': { name: '沙烏地阿拉伯', nameEn: 'Saudi Arabia' },
  'SEN': { name: '塞內加爾', nameEn: 'Senegal' },
  'SRB': { name: '塞爾維亞', nameEn: 'Serbia' },
  'SYC': { name: '塞席爾', nameEn: 'Seychelles' },
  'SLE': { name: '獅子山', nameEn: 'Sierra Leone' },
  'SGP': { name: '新加坡', nameEn: 'Singapore' },
  'SXM': { name: '荷屬聖馬丁', nameEn: 'Sint Maarten (Dutch part)' },
  'SVK': { name: '斯洛伐克', nameEn: 'Slovakia' },
  'SVN': { name: '斯洛維尼亞', nameEn: 'Slovenia' },
  'SLB': { name: '索羅門群島', nameEn: 'Solomon Islands' },
  'SOM': { name: '索馬利亞', nameEn: 'Somalia' },
  'ZAF': { name: '南非', nameEn: 'South Africa' },
  'SGS': { name: '南喬治亞和南桑威奇群島', nameEn: 'South Georgia and the South Sandwich Islands' },
  'SSD': { name: '南蘇丹', nameEn: 'South Sudan' },
  'ESP': { name: '西班牙', nameEn: 'Spain' },
  'LKA': { name: '斯里蘭卡', nameEn: 'Sri Lanka' },
  'SDN': { name: '蘇丹', nameEn: 'Sudan' },
  'SUR': { name: '蘇利南', nameEn: 'Suriname' },
  'SJM': { name: '斯瓦爾巴和揚馬延', nameEn: 'Svalbard and Jan Mayen' },
  'SWE': { name: '瑞典', nameEn: 'Sweden' },
  'CHE': { name: '瑞士', nameEn: 'Switzerland' },
  'SYR': { name: '敘利亞', nameEn: 'Syrian Arab Republic' },
  'TWN': { name: '台灣', nameEn: 'Taiwan' },
  'TJK': { name: '塔吉克', nameEn: 'Tajikistan' },
  'TZA': { name: '坦尚尼亞', nameEn: 'Tanzania' },
  'THA': { name: '泰國', nameEn: 'Thailand' },
  'TLS': { name: '東帝汶', nameEn: 'Timor-Leste' },
  'TGO': { name: '多哥', nameEn: 'Togo' },
  'TKL': { name: '托克勞', nameEn: 'Tokelau' },
  'TON': { name: '東加', nameEn: 'Tonga' },
  'TTO': { name: '千里達及托巴哥', nameEn: 'Trinidad and Tobago' },
  'TUN': { name: '突尼西亞', nameEn: 'Tunisia' },
  'TUR': { name: '土耳其', nameEn: 'Turkey' },
  'TKM': { name: '土庫曼', nameEn: 'Turkmenistan' },
  'TCA': { name: '特克斯和凱科斯群島', nameEn: 'Turks and Caicos Islands' },
  'TUV': { name: '吐瓦魯', nameEn: 'Tuvalu' },
  'UGA': { name: '烏干達', nameEn: 'Uganda' },
  'UKR': { name: '烏克蘭', nameEn: 'Ukraine' },
  'ARE': { name: '阿拉伯聯合大公國', nameEn: 'United Arab Emirates' },
  'GBR': { name: '英國', nameEn: 'United Kingdom' },
  'USA': { name: '美國', nameEn: 'United States of America' },
  'UMI': { name: '美國本土外小島嶼', nameEn: 'United States Minor Outlying Islands' },
  'URY': { name: '烏拉圭', nameEn: 'Uruguay' },
  'UZB': { name: '烏茲別克', nameEn: 'Uzbekistan' },
  'VUT': { name: '萬那杜', nameEn: 'Vanuatu' },
  'VEN': { name: '委內瑞拉', nameEn: 'Venezuela' },
  'VNM': { name: '越南', nameEn: 'Viet Nam' },
  'VGB': { name: '英屬維京群島', nameEn: 'Virgin Islands (British)' },
  'VIR': { name: '美屬維京群島', nameEn: 'Virgin Islands (U.S.)' },
  'WLF': { name: '瓦利斯和富圖納', nameEn: 'Wallis and Futuna' },
  'ESH': { name: '西撒哈拉', nameEn: 'Western Sahara' },
  'YEM': { name: '葉門', nameEn: 'Yemen' },
  'ZMB': { name: '尚比亞', nameEn: 'Zambia' },
  'ZWE': { name: '辛巴威', nameEn: 'Zimbabwe' }
};

/**
 * Country Codes 工具類
 */
class CountryCodes {
  /**
   * 根據 ISO 代碼獲取國家信息
   * @param {string} code - ISO 3166-1 alpha-3 代碼
   * @returns {Object|null} 國家信息 { name, nameEn }
   */
  static get(code) {
    return COUNTRY_CODES[code.toUpperCase()] || null;
  }

  /**
   * 根據中文名稱查找 ISO 代碼
   * @param {string} name - 中文名稱
   * @returns {string|null} ISO 代碼
   */
  static findByChineseName(name) {
    for (const [code, info] of Object.entries(COUNTRY_CODES)) {
      if (info.name === name) {
        return code;
      }
    }
    return null;
  }

  /**
   * 根據英文名稱查找 ISO 代碼
   * @param {string} nameEn - 英文名稱
   * @returns {string|null} ISO 代碼
   */
  static findByEnglishName(nameEn) {
    for (const [code, info] of Object.entries(COUNTRY_CODES)) {
      if (info.nameEn.toLowerCase() === nameEn.toLowerCase()) {
        return code;
      }
    }
    return null;
  }

  /**
   * 獲取所有國家代碼
   * @returns {string[]} ISO 代碼數組
   */
  static getAllCodes() {
    return Object.keys(COUNTRY_CODES);
  }

  /**
   * 檢查代碼是否存在
   * @param {string} code - ISO 代碼
   * @returns {boolean}
   */
  static has(code) {
    return code.toUpperCase() in COUNTRY_CODES;
  }

  /**
   * 根據中文名稱模糊查找 ISO 代碼（支持部分匹配）
   * @param {string} query - 查詢字符串（支持部分匹配）
   * @returns {Array<{code: string, name: string, nameEn: string, match: string, score: number}>} 匹配結果數組
   */
  static searchByChineseName(query) {
    if (!query || query.trim() === '') return [];
    
    const queryLower = query.trim().toLowerCase();
    const results = [];
    
    for (const [code, info] of Object.entries(COUNTRY_CODES)) {
      const name = info.name;
      const nameLower = name.toLowerCase();
      
      // 完全匹配
      if (name === query.trim()) {
        results.unshift({ code, name, nameEn: info.nameEn, match: 'exact', score: 100 });
      }
      // 開頭匹配
      else if (nameLower.startsWith(queryLower)) {
        results.push({ code, name, nameEn: info.nameEn, match: 'prefix', score: 80 });
      }
      // 包含匹配
      else if (nameLower.includes(queryLower)) {
        results.push({ code, name, nameEn: info.nameEn, match: 'contains', score: 60 });
      }
    }
    
    // 按分數排序（完全匹配 > 開頭匹配 > 包含匹配）
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * 根據英文名稱模糊查找 ISO 代碼（支持部分匹配）
   * @param {string} query - 查詢字符串（支持部分匹配）
   * @returns {Array<{code: string, name: string, nameEn: string, match: string, score: number}>} 匹配結果數組
   */
  static searchByEnglishName(query) {
    if (!query || query.trim() === '') return [];
    
    const queryLower = query.trim().toLowerCase();
    const results = [];
    const seenCodes = new Set();
    
    for (const [code, info] of Object.entries(COUNTRY_CODES)) {
      if (seenCodes.has(code)) continue;
      
      const nameEn = info.nameEn;
      const nameEnLower = nameEn.toLowerCase();
      
      // 完全匹配（不區分大小寫）
      if (nameEnLower === queryLower) {
        results.unshift({ code, name: info.name, nameEn, match: 'exact', score: 100 });
        seenCodes.add(code);
        continue;
      }
      
      // 開頭匹配
      if (nameEnLower.startsWith(queryLower)) {
        results.push({ code, name: info.name, nameEn, match: 'prefix', score: 80 });
        seenCodes.add(code);
        continue;
      }
      
      // 包含匹配
      if (nameEnLower.includes(queryLower)) {
        results.push({ code, name: info.name, nameEn, match: 'contains', score: 60 });
        seenCodes.add(code);
        continue;
      }
      
      // 單詞開頭匹配（例如 "United" 匹配 "United States of America"）
      const words = nameEnLower.split(/\s+/);
      for (const word of words) {
        if (word.startsWith(queryLower)) {
          results.push({ code, name: info.name, nameEn, match: 'word-prefix', score: 70 });
          seenCodes.add(code);
          break;
        }
      }
    }
    
    // 按分數排序
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * 統一搜尋（自動識別中英文並搜尋）
   * @param {string} query - 查詢字符串
   * @returns {Array<{code: string, name: string, nameEn: string, match: string, score: number, source: 'chinese'|'english'|'both'}>} 匹配結果數組
   */
  static search(query) {
    if (!query || query.trim() === '') return [];
    
    const trimmedQuery = query.trim();
    const results = [];
    const seenCodes = new Set();
    
    // 檢測是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(trimmedQuery);
    
    // 如果包含中文，優先搜索中文
    if (hasChinese) {
      const cnResults = this.searchByChineseName(trimmedQuery);
      cnResults.forEach(r => {
        if (!seenCodes.has(r.code)) {
          seenCodes.add(r.code);
          results.push({ ...r, source: 'chinese' });
        }
      });
    }
    
    // 同時搜索英文（可能用戶輸入的是英文，或中文搜索無結果）
    const enResults = this.searchByEnglishName(trimmedQuery);
    enResults.forEach(r => {
      if (!seenCodes.has(r.code)) {
        seenCodes.add(r.code);
        const source = seenCodes.size === results.length + 1 ? 'english' : 'both';
        results.push({ ...r, source });
      } else {
        // 如果已經存在（從中文搜索得到），更新 source 為 'both'
        const existingIndex = results.findIndex(item => item.code === r.code);
        if (existingIndex !== -1 && results[existingIndex].source === 'chinese') {
          results[existingIndex].source = 'both';
          // 如果英文匹配分數更高，更新分數
          if (r.score > results[existingIndex].score) {
            results[existingIndex].score = r.score;
            results[existingIndex].match = r.match;
          }
        }
      }
    });
    
    // 按分數排序
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * 根據中文或英文名稱查找 ISO 代碼（優先完全匹配，fallback 到模糊搜索）
   * @param {string} name - 國家名稱（中文或英文）
   * @returns {string|null} ISO 代碼
   */
  static findByName(name) {
    if (!name) return null;
    
    // 先嘗試精確匹配
    let code = this.findByChineseName(name);
    if (code) return code;
    
    code = this.findByEnglishName(name);
    if (code) return code;
    
    // 如果精確匹配失敗，使用模糊搜索
    const results = this.search(name);
    return results.length > 0 ? results[0].code : null;
  }
}

// 導出到全局
if (typeof window !== 'undefined') {
  window.COUNTRY_CODES = COUNTRY_CODES;
  window.CountryCodes = CountryCodes;
}

// 導出（Node.js 環境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { COUNTRY_CODES, CountryCodes };
}




