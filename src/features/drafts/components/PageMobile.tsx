import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NavigationBarMobile from "./NavigationBar/NavigationBarMobile";
import MemoList from "./MemoList";
import QuickMemoInput from "./QuickMemoInput";
import FullScreenMemoInput from "./FullScreenMemoInput";
import "./PagePC.css";
import SwipeArea from "src/components/SwipeArea";
import { useFilter } from "../hooks/useFilter";
import { Filter } from "../types/filters";
import { Category } from "../types/categories";
import { SearchTag } from "../types/searchTag";
import { generateFilterName } from "../utils/filterUtils";
import { formatLogicalText } from "../utils/logicalTextFormatter";
import tagExpressionService from '../services/tagExpressionService';

const PageMobile: React.FC = () => {
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [dateQuery, setDateQuery] = useState<string>("");
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | undefined>(undefined);
  const [filterTags, setFilterTags] = useState<SearchTag[]>([]);
  const [mode, setMode] = useState<'input' | 'list'>('input');
  const { activeFilter, handleFilterClick } = useFilter((query) => setFilterQuery(query));
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const navigate = useNavigate();

  const handleSwipeUp = () => {
    console.debug("PageMobile.swipeUp");
    window.dispatchEvent(new CustomEvent("swipeUp"));
    try {
      navigate(1);
    } catch (e) {
      console.debug("PageMobile.navigate.forward.failed", e);
    }
  };

  const handleSwipeDown = () => {
    console.debug("PageMobile.swipeDown");
    window.dispatchEvent(new CustomEvent("swipeDown"));
    try {
      navigate(-1);
    } catch (e) {
      console.debug("PageMobile.navigate.back.failed", e);
    }
  };

  const handleTopTap = () => {
    // 上部をタップしたら一覧モードへ
    setMode('list');
  };

  const handleBackToInput = () => {
    setMode('input');
    setDateQuery(''); // Reset date query when returning to input mode
  };

  useEffect(() => {
    loadFiltersAndCategories();
  }, []);

  // Generate embedding when dateQuery changes
  useEffect(() => {
    if (dateQuery) {
      const generateQueryEmbedding = async () => {
        try {
          const response = await fetch('/api/embeddings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: [dateQuery] }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.embeddings && data.embeddings[0]) {
              setQueryEmbedding(data.embeddings[0]);
            } else {
              setQueryEmbedding(undefined);
            }
          } else {
            setQueryEmbedding(undefined);
          }
        } catch (err) {
          console.error('[PageMobile] Failed to compute query embedding:', err);
          setQueryEmbedding(undefined);
        }
      };
      generateQueryEmbedding();
    } else {
      setQueryEmbedding(undefined);
    }
  }, [dateQuery]);

  // Listen for search events dispatched from NavigationBar components.
  React.useEffect(() => {
    const onSearchExecuted = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail;
        if (detail) {
          if (detail.type === 'clear') {
            // クリア時はすべての検索条件をリセット
            setDateQuery('');
            setFilterTags([]);
            return;
          }
          if (typeof detail.query === 'string') {
            setDateQuery(detail.query);
            // if not already in list mode, switch to list so user sees results
            setMode('list');
          }
          if (detail.type === 'tags' && Array.isArray(detail.tags)) {
            setFilterTags(detail.tags);
            // also switch to list so user sees filtered results
            setMode('list');
          }
        }
      } catch (err) {
        console.error('onSearchExecuted handler error', err);
      }
    };

    window.addEventListener('searchExecuted', onSearchExecuted as EventListener);
    return () => window.removeEventListener('searchExecuted', onSearchExecuted as EventListener);
  }, []);

  const loadFiltersAndCategories = async () => {
    try {
      const { filters: f, categories: c } = await tagExpressionService.load();
      setFilters(f);
      setCategories(c);
    } catch (error) {
      console.error('フィルタ・カテゴリの読み込みエラー:', error);
    }
  };

  return (
    <SwipeArea className="mobile-page" onSwipeUp={handleSwipeUp} onSwipeDown={handleSwipeDown} axis="vertical">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', minHeight: '100dvh' }}>
        <header onClick={handleTopTap} style={{ touchAction: 'manipulation', flexShrink: 0 }}>
          {mode === 'input' ? (
            <div
              className="input-header"
              style={{
                height: 56,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 12px',
                background: 'var(--bg, #fff)',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
                userSelect: 'none',
              }}
            >
              <div style={{ width: 64, height: 6, borderRadius: 4, background: '#e6e6e6', marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', lineHeight: 1 }}>
                タップでメモ一覧を表示
              </div>
            </div>
          ) : (
            <NavigationBarMobile
              onBack={handleBackToInput}
              onSettings={() => {
                try {
                  navigate('/settings');
                } catch (e) {
                  console.debug('NavigationBarMobile.settings.navigate.failed', e);
                }
              }}
            />
          )}
        </header>

        <main style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {mode === 'input' ? (
            // フルスクリーン入力: よりゴージャスな FullScreenMemoInput を中央に表示
            <section className="quick-input full-screen-input" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <FullScreenMemoInput />
            </section>
          ) : (
            // 一覧モード: 上部に戻る UI とアクティブフィルター表示
            <section className="memo-list" style={{ flex: 1, overflow: 'auto', padding: '0.75rem' }}>
              {/* Active Filter UI with search and category buttons */}
              <div style={{ marginBottom: 12 }}>
                {/* Categories and Filters as buttons */}
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 4 }}>
                  {/* Date search clear button (shown when dateQuery is active) */}
                  {dateQuery && (
                    <button
                      onClick={() => setDateQuery('')}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #fca5a5',
                        background: '#fee2e2',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        flex: '0 0 auto',
                        fontWeight: 500,
                        color: '#991b1b',
                      }}
                      title="日付検索をクリア"
                    >
                      📅 {dateQuery} ✕
                    </button>
                  )}
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleFilterClick(category)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                        border: activeFilter === category.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                        background: activeFilter === category.id ? '#e0e7ff' : '#fff',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        // borderLeft: category.color ? `4px solid ${category.color}` : undefined,
                        display: 'inline-flex',
                        flex: '0 0 auto',
                      }}
                    >
                      {category.name}
                    </button>
                  ))}
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterClick(filter)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '4px',
                        border: activeFilter === filter.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                        background: activeFilter === filter.id ? '#e0e7ff' : '#fff',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        display: 'inline-flex',
                        flex: '0 0 auto',
                        alignItems: 'center', // テキストを縦中央揃え
                        lineHeight: 1.2, // テキストの上下余白を抑える
                      }}
                    >
                      {formatLogicalText(generateFilterName(filter.orTerms))}
                    </button>
                  ))}
                </div>
              </div>
              <MemoList filterQuery={filterQuery} dateQuery={dateQuery} queryEmbedding={queryEmbedding} filterTags={filterTags} />
            </section>
          )}
        </main>

        {/* QuickMemoInput は入力専用の UI を画面中央に出しているのでフッターは必要ないが、
            追加の操作を残したければここに置ける */}
        {mode === 'input' ? null : (
          <footer className="fixed bottom-0 left-0 right-0 bg-white border-t">
            <QuickMemoInput />
          </footer>
        )}
      </div>
    </SwipeArea>
  );
};

export default PageMobile;