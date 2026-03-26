import React, { useEffect, useState } from "react";
import "./MemoList.css";
import { useNavigate } from "react-router";
import { useMemoSearch } from "../hooks/useMemoSearch";
import { useSortedMemos } from "../hooks/useSortedMemos";
import { Memo, MemoListProps } from "../types/memo";
import { memoService } from "../services/memoService";
import { getTagNameById, initializeTags } from "../utils/tagUtils";

const MemoList: React.FC<MemoListProps> = ({ filterQuery, dateQuery, queryEmbedding, textQuery, tagQuery }) => {
  // デバッグ用: タグを常に表示するかどうか
  const DEBUG_ALWAYS_SHOW_TAGS = false;
  // 非同期（未同期）メモの見た目差分を有効化
  const ENABLE_ASYNC_MEMO_VISUAL = true;
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortKey, setSortKey] = useState<"date" | "title">("date");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [, setTagCacheVersion] = useState(0);

  // 全データを一括で取得
  useEffect(() => {
    const loadTagsInBackground = async () => {
      try {
        await initializeTags();
        setTagCacheVersion((prev) => prev + 1);
      } catch (error) {
        console.error('タグの読み込みエラー:', error);
      }
    };

    const loadAllData = async () => {
      try {
        // メモ一覧を先に表示したいので、タグ初期化は待たずに並列で開始
        loadTagsInBackground();

        const memosData = await memoService.getMemos();

        console.log("Number of memos:", memosData.length);
        setMemos(memosData);
      } catch (error) {
        console.error('データの読み込みエラー:', error);
      }
    };

    loadAllData();

    // 新規メモ作成時のイベントリスナー
    const handleMemoSaved = async (event: any) => {
      const newMemo = event.detail;
      if (newMemo) {
        // 新しいタグが追加されている可能性があるので、タグ一覧を更新
        await loadTagsInBackground();
        setMemos((prevMemos) => {
          // 既に存在するメモなら更新、なければ追加
          const existingIndex = prevMemos.findIndex((m) => m.id === newMemo.id);
          if (existingIndex >= 0) {
            const updated = [...prevMemos];
            updated[existingIndex] = newMemo;
            return updated;
          }
          return [newMemo, ...prevMemos];
        });
      }
    };

    window.addEventListener('memoSaved', handleMemoSaved);
    // 同期完了時にメモ一覧を再読み込み（ローカルID→サーバーID置換を反映）
    const handleSyncComplete = async () => {
      try {
        await loadTagsInBackground();
        const memosData = await memoService.getMemos();
        setMemos(memosData);
      } catch (e) {
        console.error('同期後のリロードエラー:', e);
      }
    };
    window.addEventListener('syncComplete', handleSyncComplete);
    return () => {
      window.removeEventListener('memoSaved', handleMemoSaved);
      window.removeEventListener('syncComplete', handleSyncComplete);
    };
  }, []);

  // 1. まず全メモに対して指定のソート（日付順やタイトル順など）を先に適用する
  const baseSortedMemos = useSortedMemos(memos, sortKey, sortOrder);

  // 2. その後でフィルタリングとあいまい検索（スコア順）を適用する
  // Javascriptのsortは安定ソートのため、スコアが同点のメモ（すべてスコア0のメモ等）は
  // ここで適用した「ベースのソート順」を維持したまま一覧に残る
  const sortedMemos = useMemoSearch(baseSortedMemos, filterQuery, dateQuery, textQuery, tagQuery);

  // デバッグ用ログ
  console.log("Raw memos:", memos.length);
  console.log("Filter query:", filterQuery);
  console.log("Date query:", dateQuery);
  console.log("Text query:", textQuery);
  console.log("Tag query:", tagQuery);
  console.log("Processed memos:", sortedMemos.length);

  return (
    <div className="memo-list">
      <div className="memo-list-header">
        <div className="memo-list-sort">
          <span
            className={`sortable ${sortOrder === "asc" && sortKey === "date" ? "active" : ""}`}
            onClick={() => {
              setSortKey("date");
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            }}
          >
            日付 {sortKey === "date" && (sortOrder === "asc" ? "▲" : "▼")}
          </span>
          <span
            className={`sortable ${sortOrder === "asc" && sortKey === "title" ? "active" : ""}`}
            onClick={() => {
              setSortKey("title");
              setSortOrder(sortOrder === "asc" ? "desc" : "asc");
            }}
          >
            タイトル {sortKey === "title" && (sortOrder === "asc" ? "▲" : "▼")}
          </span>
        </div>
      </div>
      <ul>
        {sortedMemos.map((memo) => (
          <li
            key={memo.id}
            className={ENABLE_ASYNC_MEMO_VISUAL && memo._syncStatus && memo._syncStatus !== 'synced' ? 'memo-item-async' : ''}
            onClick={() => navigate(`/app/edit/${memo.id}`)}
            onMouseEnter={() => {
              window.dispatchEvent(
                new CustomEvent('memoHover', {
                  detail: {
                    memo: {
                      id: memo.id,
                      title: memo.title,
                      body: memo.body,
                      date: memo.date,
                      tags: memo.tags?.map((tag: any) => ({
                        id: typeof tag === 'string' ? tag : tag.id,
                        name: getTagNameById(typeof tag === 'string' ? tag : tag.id)
                      }))
                    }
                  }
                })
              );
            }}
            onMouseLeave={() => {
              window.dispatchEvent(
                new CustomEvent('memoHover', {
                  detail: { memo: null }
                })
              );
            }}
          >
            <span className="memo-date">{memo.date || "不明"}</span>
            <span className="memo-title">{memo.title}</span>
            {(DEBUG_ALWAYS_SHOW_TAGS || filterQuery || (tagQuery && tagQuery.length > 0)) && (
              <span className="memo-tags">
                {(memo.tags || []).slice(0, 3).map((tag: any) => {
                  // tagがオブジェクト(Tag)ならidを、文字列ならそのまま
                  const tagId = typeof tag === 'string' ? tag : tag.id;
                  const isHighlighted = Array.isArray(memo.matchedTagIds) && memo.matchedTagIds.includes(tagId);
                  return (
                    <span
                      key={tagId}
                      className={`tag ${isHighlighted ? "highlight" : ""}`}
                    >
                      {getTagNameById(tagId)}
                    </span>
                  );
                })}
                {memo.tags && memo.tags.length > 3 && (
                  <span className="tag tag-overflow">+{memo.tags.length - 3}</span>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MemoList;