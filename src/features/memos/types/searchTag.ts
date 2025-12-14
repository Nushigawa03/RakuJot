export interface SearchTag {
  id: string;        // 内部で使用するタグID
  name: string;      // 表示用のタグ名
  isExclude: boolean; // 除外タグかどうか（NOT検索）
}
