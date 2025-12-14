// タグが現在の検索クエリでハイライトされるべきかを判定
// シンプル化: このユーティリティはタグID、任意の文字列クエリ、およびメモ内タグ配列のみを受け取る
export const shouldHighlightTag = (
  tagId: string,
  query: string,
  memoTags: string[]
): boolean => {
  if (!query) return false;

  // 現在はクエリがタグIDを含むかどうかを基準にハイライト
  // 将来的にクエリが TagExpression ID の場合は別途評価できるよう拡張可能
  return query.includes(tagId);
};
