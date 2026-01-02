import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import NavigationBarMobile from "./NavigationBar/NavigationBarMobile";
import MemoList from "./MemoList";
import QuickMemoInput from "./Input/QuickMemoInput";
import FullScreenMemoInput from "./Input/FullScreenMemoInput";
import "./PageMobile.css";
import SwipeArea from "src/components/SwipeArea";
import { useTagExpression } from "../hooks/useTagExpression";
import { TagExpression } from "../types/tagExpressions";
import { SearchTag } from "../types/searchTag";
import { generateExpressionName } from "../utils/tagExpressionUtils";
import { formatLogicalText } from "../utils/logicalTextFormatter";
import tagExpressionService from '../services/tagExpressionService';

const PageMobile: React.FC = () => {
  const [filterQuery, setFilterQuery] = useState<string>("");
  const [dateQuery, setDateQuery] = useState<string>("");
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | undefined>(undefined);
  const [filterTags, setFilterTags] = useState<SearchTag[]>([]);
  const [mode, setMode] = useState<'input' | 'list'>('input');
  const { activeExpression, handleExpressionClick } = useTagExpression((query) => setFilterQuery(query));
  const [expressions, setExpressions] = useState<TagExpression[]>([]);

  const navigate = useNavigate();

  const handleSwipeUp = () => {
    console.debug("PageMobile.swipeUp");
    window.dispatchEvent(new CustomEvent("swipeUp"));
    try {
      // navigate(1);
    } catch (e) {
      console.debug("PageMobile.navigate.forward.failed", e);
    }
  };

  const handleSwipeDown = () => {
    console.debug("PageMobile.swipeDown");
    window.dispatchEvent(new CustomEvent("swipeDown"));
    try {
      // navigate(-1);
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
      const exprs = await tagExpressionService.load();
      setExpressions(exprs as any);
    } catch (error) {
      console.error('TagExpression の読み込みエラー:', error);
    }
  };

  useEffect(() => {
    // function to update CSS variable --kbd-height based on visualViewport
    const updateKeyboardInset = () => {
      try {
        const vv = (window as any).visualViewport;
        if (vv && typeof vv.height === 'number') {
          // difference between layout viewport and visual viewport height is the keyboard height
          const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
          document.documentElement.style.setProperty('--kbd-height', `${keyboardHeight}px`);
        } else {
          // fallback: no VisualViewport API
          document.documentElement.style.setProperty('--kbd-height', `0px`);
        }
      } catch (e) {
        // ignore
      }
    };

    // update on visualViewport resize (keyboard show/hide) and on window resize
    const vv = (window as any).visualViewport;
    if (vv && typeof vv.addEventListener === 'function') {
      vv.addEventListener('resize', updateKeyboardInset);
      vv.addEventListener('scroll', updateKeyboardInset);
    }
    window.addEventListener('resize', updateKeyboardInset);
    // also update when focusing inputs (some browsers change sizes on focus)
    window.addEventListener('focusin', updateKeyboardInset);
    window.addEventListener('focusout', updateKeyboardInset);

    // initial call
    updateKeyboardInset();

    return () => {
      try {
        if (vv && typeof vv.removeEventListener === 'function') {
          vv.removeEventListener('resize', updateKeyboardInset);
          vv.removeEventListener('scroll', updateKeyboardInset);
        }
      } catch {}
      window.removeEventListener('resize', updateKeyboardInset);
      window.removeEventListener('focusin', updateKeyboardInset);
      window.removeEventListener('focusout', updateKeyboardInset);
      // reset variable
      document.documentElement.style.setProperty('--kbd-height', `0px`);
    };
  }, []);

  return (
    <SwipeArea className="mobile-page" onSwipeUp={handleSwipeUp} onSwipeDown={handleSwipeDown} axis="vertical">
      <div className="page-mobile">
        <header className="page-mobile__header" onClick={handleTopTap}>
          {mode === 'input' ? (
            <div className="page-mobile__handle-card">
              <div className="page-mobile__handle" />
              <div className="page-mobile__handle-text">タップでメモ一覧を表示</div>
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

        <main className="page-mobile__main">
          {mode === 'input' ? (
            <section className="quick-input full-screen-input page-mobile__quick-input">
              <FullScreenMemoInput />
            </section>
          ) : (
            <section className="memo-list page-mobile__list">
              <div className="page-mobile__filters">
                <div className="page-mobile__pill-row">
                  {dateQuery && (
                    <button
                      onClick={() => setDateQuery('')}
                      className="page-mobile__pill page-mobile__pill--danger"
                      title="日付検索をクリア"
                    >
                      📅 {dateQuery} ✕
                    </button>
                  )}
                  {expressions
                    .filter(e => !!e.name)
                    .map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleExpressionClick(category)}
                        className={`page-mobile__pill ${activeExpression === category.id ? 'page-mobile__pill--active' : ''}`}
                      >
                        {category.name}
                      </button>
                    ))}
                  {expressions
                    .filter(e => !e.name)
                    .map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => handleExpressionClick(filter)}
                        className={`page-mobile__pill ${activeExpression === filter.id ? 'page-mobile__pill--active' : ''}`}
                      >
                        {formatLogicalText(generateExpressionName(filter.orTerms))}
                      </button>
                    ))}
                </div>
              </div>
              <MemoList filterQuery={filterQuery} dateQuery={dateQuery} queryEmbedding={queryEmbedding} filterTags={filterTags} />
            </section>
          )}
        </main>

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