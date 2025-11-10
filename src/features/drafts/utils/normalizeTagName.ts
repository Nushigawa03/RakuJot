// タグ名を正規化する（全角・半角・大文字小文字・前後空白を無視して比較できるようにする）
export function normalizeTagName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角英数字→半角
    .replace(/\s+/g, ''); // 空白除去
}
