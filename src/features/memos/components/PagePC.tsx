import React, { useState, useEffect } from 'react';
import NavigationBar from './NavigationBar/NavigationBar';
import MemoList from './MemoList';
import Sidebar from './Sidebar/Sidebar';
import QuickMemoInput from './Input/QuickMemoInput';
import { MemoPreview } from './Sidebar/MemoPreview';
import './PagePC.css';
import { useSearchFilters } from '../hooks/useSearchFilters';

const Page: React.FC = () => {
  // useSearchFiltersフックを使用して検索条件を一元管理
  const {
    filterQuery,
    setFilterQuery,
    dateQuery,
    textQuery,
    queryEmbedding,
    tagQuery
  } = useSearchFilters();

  const [hoveredMemo, setHoveredMemo] = useState<{
    id: string;
    title: string;
    body: string;
    date?: string;
    tags?: { id: string; name: string }[];
  } | null>(null);

  // Listen for memo hover events from MemoList
  useEffect(() => {
    const onMemoHover = (ev: Event) => {
      try {
        const detail = (ev as CustomEvent).detail;
        setHoveredMemo(detail.memo || null);
      } catch (err) {
        console.error('onMemoHover handler error', err);
      }
    };

    window.addEventListener('memoHover', onMemoHover as EventListener);
    return () => window.removeEventListener('memoHover', onMemoHover as EventListener);
  }, []);

  return (
    <div className="page-container">
      <header>
        <NavigationBar activeTextQuery={textQuery} />
      </header>
      <div className="main-content">
        <aside className="sidebar">
          <Sidebar onFilterChange={setFilterQuery} />
        </aside>
        <section className="memo-list">
          <MemoList
            filterQuery={filterQuery}
            dateQuery={dateQuery}
            textQuery={textQuery}
            tagQuery={tagQuery}
            queryEmbedding={queryEmbedding}
          />
        </section>
        <aside className="recommendation-section">
          <MemoPreview memo={hoveredMemo} />
        </aside>
      </div>
      <footer>
        <QuickMemoInput />
      </footer>
    </div>
  );
};

export default Page;