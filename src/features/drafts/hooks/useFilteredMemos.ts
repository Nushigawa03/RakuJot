// filepath: [useFilteredMemos.ts](http://_vscodecontentref_/0)
import { Memo } from '../types/memo';

export const useFilteredMemos = (memos: Memo[], filterQuery: string): Memo[] => {
  return memos.filter((memo) => {
    if (!filterQuery) return true;

    const queryParts = filterQuery.split(' ').filter(part => part.trim() !== '');
    const memoTags = memo.tags || [];
    
    // 検索クエリが空の場合はすべてのメモを返す
    if (queryParts.length === 0) return true;

    // NOT条件（除外タグ）を先に処理
    const excludeTags: string[] = [];
    
    // NOT演算子の処理
    for (let i = 0; i < queryParts.length; i++) {
      if (queryParts[i] === 'NOT' && i + 1 < queryParts.length) {
        // 'NOT tag'形式の処理
        excludeTags.push(queryParts[i + 1]);
        queryParts[i] = '';
        queryParts[i + 1] = '';
      } else if (queryParts[i].startsWith('-')) {
        // '-tag'形式の処理
        excludeTags.push(queryParts[i].substring(1));
        queryParts[i] = '';
      }
    }
    
    // 除外タグに一致するものがあれば、そのメモを除外
    if (excludeTags.some(tag => memoTags.includes(tag))) {
      return false;
    }

    // 空でない残りの部分を取得
    const remainingParts = queryParts.filter(part => part !== '');
    
    // 残りの検索条件がない場合は、NOT条件の処理後にtrueを返す
    if (remainingParts.length === 0) return true;
    
    // OR条件を処理
    const orGroups: string[][] = [[]];
    let currentGroup = 0;

    for (let i = 0; i < remainingParts.length; i++) {
      const part = remainingParts[i];
      
      // OR演算子の場合、新しいグループを作成
      if (part === 'OR') {
        currentGroup++;
        orGroups[currentGroup] = [];
      } 
      // AND演算子は明示的にスキップ
      else if (part === 'AND') {
        continue;
      } 
      // 通常のタグの場合
      else {
        if (!orGroups[currentGroup]) {
          orGroups[currentGroup] = [];
        }
        orGroups[currentGroup].push(part);
      }
    }

    // 各ORグループ内ではAND条件で評価（すべてのタグに一致する必要がある）
    // ORグループ間ではいずれかのグループが完全に一致すればよい
    return orGroups.some(group => {
      // 空のグループはスキップ
      if (group.length === 0) return false;
      
      // グループ内のすべてのタグがメモのタグに含まれているか確認（AND条件）
      return group.every(tag => memoTags.includes(tag));
    });
  });
};