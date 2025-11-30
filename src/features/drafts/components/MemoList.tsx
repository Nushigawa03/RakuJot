import React, { useEffect, useState } from "react";
import "./MemoList.css";
import { useNavigate } from "react-router-dom";
import { useFilteredMemos } from "../hooks/useFilteredMemos";
import { useSortedMemos } from "../hooks/useSortedMemos";
import { Memo, MemoListProps } from "../types/memo";
import { memoService } from "../services/memoService";
import { getTagNameById, initializeTags } from "../utils/tagUtils";
import { shouldHighlightTag } from "../utils/tagHighlight";
import type { Filter } from "../types/filters";
import type { Category } from "../types/categories";
import tagExpressionService from '../services/tagExpressionService';

const MemoList: React.FC<MemoListProps> = ({ filterQuery, dateQuery, queryEmbedding, filterTags }) => {
  // デバッグ用: タグを常に表示するかどうか
  const DEBUG_ALWAYS_SHOW_TAGS = true;
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortKey, setSortKey] = useState<"date" | "title">("date");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // APIからメモを取得
  useEffect(() => {
    const fetchMemos = async () => {
      try {
        console.log("Fetching memos via memoService...");
        const data = await memoService.getMemos();
        console.log("Number of memos:", data.length);
        setMemos(data);
      } catch (error) {
        console.error("Error fetching memos:", error);
      }
    };

    fetchMemos();
  }, []);

  // フィルタとカテゴリとタグを取得
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [exprsResult] = await Promise.all([
          tagExpressionService.load(),
          initializeTags(), // タグデータを初期化
        ]);

        if (exprsResult) {
          setFilters(exprsResult.filters);
          setCategories(exprsResult.categories);
        }
      } catch (error) {
        console.error('フィルタ・カテゴリ・タグの読み込みエラー:', error);
      }
    };

    loadFilterData();
  }, []);

  const filteredMemos = useFilteredMemos(memos, filterQuery, dateQuery, queryEmbedding, filterTags);
  const sortedMemos = useSortedMemos(filteredMemos, sortKey, sortOrder);

  // デバッグ用ログ
  console.log("Raw memos:", memos.length);
  console.log("Filter query:", filterQuery);
  console.log("Date query:", dateQuery);
  console.log("Filtered memos:", filteredMemos.length);
  console.log("Sorted memos:", sortedMemos.length);

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
          <li key={memo.id} onClick={() => navigate(`/drafts/edit/${memo.id}`)}>
            <span className="memo-date">{memo.date || "不明"}</span>
            <span className="memo-title">{memo.title}</span>
            {(DEBUG_ALWAYS_SHOW_TAGS || filterQuery) && (
              <span className="memo-tags">
                {(memo.tags || []).map((tag: any) => {
                  // tagがオブジェクト(Tag)ならidを、文字列ならそのまま
                  const tagId = typeof tag === 'string' ? tag : tag.id;
                  return (
                    <span
                      key={tagId}
                      className={`tag ${shouldHighlightTag(tagId, filterQuery, memo.tags, filters, categories) ? "highlight" : ""}`}
                    >
                      {getTagNameById(tagId)}
                    </span>
                  );
                })}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MemoList;