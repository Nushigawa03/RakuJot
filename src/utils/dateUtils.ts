/**
 * HTML5の <input type="date"> が標準で要求・出力する
 * RFC 3339 (full-date) 形式 (YYYY-MM-DD) の日付文字列にフォーマットします。
 */
export const formatDateForPicker = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 今日の日付を RFC 3339 (full-date) 形式 (YYYY-MM-DD) で取得します。
 */
export const getTodayDateForPicker = (): string => {
  return formatDateForPicker(new Date());
};
