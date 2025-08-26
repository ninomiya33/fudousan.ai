// 価格計算用ユーティリティ
const YEN_PER_MAN = 1e4; // 1万円 = 10,000円
const M2_PER_TSUBO = 3.305785; // 1坪 = 3.305785㎡

/**
 * 円を万円に変換
 * @param {number} yen - 円
 * @returns {number} 万円
 */
const toMan = yen => Math.round(yen / YEN_PER_MAN);

/**
 * 円を適切な単位（万円/億円）でフォーマット
 * @param {number} yen - 円
 * @returns {string} フォーマットされた価格文字列
 */
const fmtPrice = yen => {
  console.log('🔍 fmtPrice デバッグ:', { yen, type: typeof yen, isNaN: isNaN(yen) });
  
  // 数値チェック
  if (typeof yen !== 'number') {
    console.error('❌ 価格が数値ではありません:', yen);
    return '価格計算中...';
  }
  
  // NaNチェック
  if (isNaN(yen)) {
    console.error('❌ 価格がNaNです:', yen);
    return '価格計算中...';
  }
  
  let result;
  if (yen >= 1e8) {
    // 1億円以上
    result = `${Math.round((yen / 1e8) * 100) / 100}億円`;
  } else {
    // 1億円未満
    result = `${toMan(yen).toLocaleString()}万円`;
  }
  
  console.log('✅ fmtPrice 結果:', result);
  return result;
};

/**
 * 価格範囲を文字列で表示
 * @param {number} lowYen - 下限価格（円）
 * @param {number} highYen - 上限価格（円）
 * @returns {string} 価格範囲文字列
 */
const priceRangeText = (lowYen, highYen) => {
  console.log('🔍 priceRangeText デバッグ:', { lowYen, highYen, typeLow: typeof lowYen, typeHigh: typeof highYen });
  
  // 数値チェック
  if (typeof lowYen !== 'number' || typeof highYen !== 'number') {
    console.error('❌ 価格が数値ではありません:', { lowYen, highYen });
    return '価格計算中...';
  }
  
  // NaNチェック
  if (isNaN(lowYen) || isNaN(highYen)) {
    console.error('❌ 価格がNaNです:', { lowYen, highYen });
    return '価格計算中...';
  }
  
  const result = `${fmtPrice(lowYen)}〜${fmtPrice(highYen)}`;
  console.log('✅ 価格範囲結果:', result);
  return result;
};

/**
 * ㎡単価を万円/㎡で表示
 * @param {number} yenPerM2 - ㎡単価（円）
 * @returns {string} 万円/㎡文字列
 */
const formatPricePerM2 = yenPerM2 => {
  const manPerM2 = Math.round((yenPerM2 / YEN_PER_MAN) * 10) / 10;
  return `${manPerM2}万円/㎡`;
};

/**
 * 坪単価を万円/坪で表示
 * @param {number} yenPerM2 - ㎡単価（円）
 * @returns {string} 万円/坪文字列
 */
const formatPricePerTsubo = yenPerM2 => {
  const manPerTsubo = Math.round((yenPerM2 * M2_PER_TSUBO / YEN_PER_MAN) * 10) / 10;
  return `${manPerTsubo}万円/坪`;
};

/**
 * 面積を坪に変換
 * @param {number} m2 - 面積（㎡）
 * @returns {number} 面積（坪）
 */
const m2ToTsubo = m2 => m2 / M2_PER_TSUBO;

/**
 * 坪を㎡に変換
 * @param {number} tsubo - 面積（坪）
 * @returns {number} 面積（㎡）
 */
const tsuboToM2 = tsubo => tsubo * M2_PER_TSUBO;

module.exports = {
  YEN_PER_MAN,
  M2_PER_TSUBO,
  toMan,
  fmtPrice,
  priceRangeText,
  formatPricePerM2,
  formatPricePerTsubo,
  m2ToTsubo,
  tsuboToM2
};
