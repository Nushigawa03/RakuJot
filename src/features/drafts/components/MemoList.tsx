import React, { useEffect, useState } from "react";
import "./MemoList.css";
import { useNavigate } from "react-router-dom";
import { useFilteredMemos } from "../hooks/useFilteredMemos";
import { useSortedMemos } from "../hooks/useSortedMemos";
import { Memo, MemoListProps } from "../types/memo";
import { getTagNameById, initializeTags } from "../utils/tagUtils";
import { shouldHighlightTag } from "../utils/tagHighlight";
import type { Filter } from "../types/filters";
import type { Category } from "../types/categories";

const MemoList: React.FC<MemoListProps> = ({ filterQuery, dateQuery, queryEmbedding, filterTags }) => {
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
        console.log("Fetching memos from API...");
        const response = await fetch("/api/memos");
        if (!response.ok) {
          throw new Error("メモの取得に失敗しました。");
        }
        const data = await response.json();
        console.log("API response:", data);
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
        const [expressionsResponse] = await Promise.all([
          fetch('/api/tagExpressions'),
          initializeTags() // タグデータを初期化
        ]);

        if (expressionsResponse.ok) {
          const data = await expressionsResponse.json();
          const filtersData = data.filter((d: any) => !d.name) as Filter[];
          const categoriesData = data.filter((d: any) => !!d.name) as Category[];
          setFilters(filtersData);
          setCategories(categoriesData);
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
            {filterQuery && (
              <span className="memo-tags">
                {memo.tags.map((tagId) => (
                  <span
                    key={tagId}
                    className={`tag ${shouldHighlightTag(tagId, filterQuery, memo.tags, filters, categories) ? "highlight" : ""}`}
                  >
                    {getTagNameById(tagId)}
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MemoList;