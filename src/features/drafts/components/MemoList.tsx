import React, { useEffect, useState } from "react";
import "./MemoList.css";
import { useNavigate } from "react-router-dom";
import { useFilteredMemos } from "../hooks/useFilteredMemos";
import { useSortedMemos } from "../hooks/useSortedMemos";
import { Memo, MemoListProps } from "../types/memo";

const MemoList: React.FC<MemoListProps> = ({ filterQuery }) => {
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [sortKey, setSortKey] = useState<"date" | "title">("date");
  const [memos, setMemos] = useState<Memo[]>([]);

  // APIからメモを取得
  useEffect(() => {
    const fetchMemos = async () => {
      try {
        const response = await fetch("/api/memos");
        if (!response.ok) {
          throw new Error("メモの取得に失敗しました。");
        }
        const data = await response.json();
        setMemos(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchMemos();
  }, []);

  const filteredMemos = useFilteredMemos(memos, filterQuery);
  const sortedMemos = useSortedMemos(filteredMemos, sortKey, sortOrder);

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
                {memo.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`tag ${filterQuery.includes(tag) ? "highlight" : ""}`}
                  >
                    {tag}
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