import React, { useState, useEffect } from 'react';
import NavigationBar from './NavigationBar/NavigationBar';
import MemoList from './MemoList';
import Sidebar from './Sidebar';
import QuickMemoInput from './QuickMemoInput';
import { MemoPreview } from './MemoPreview';
import './PagePC.css';
import { SearchTag } from '../types/searchTag';

const Page: React.FC = () => {
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [dateQuery, setDateQuery] = useState<string>('');
  const [filterTags, setFilterTags] = useState<SearchTag[]>([]);
  const [hoveredMemo, setHoveredMemo] = useState<{
    id: string;
    title: string;
    body: string;
    date?: string;
    tags?: { id: string; name: string }[];
  } | null>(null);

  // Listen for search events from NavigationBar
  useEffect(() => {
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
          }
          if (detail.type === 'tags' && Array.isArray(detail.tags)) {
            setFilterTags(detail.tags);
          }
        }
      } catch (err) {
        console.error('onSearchExecuted handler error', err);
      }
    };

    window.addEventListener('searchExecuted', onSearchExecuted as EventListener);
    return () => window.removeEventListener('searchExecuted', onSearchExecuted as EventListener);
  }, []);

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
        <NavigationBar />
      </header>
      <div className="main-content">
        <aside className="sidebar">
          <Sidebar onFilterChange={setFilterQuery} />
        </aside>
        <section className="memo-list">
          <MemoList filterQuery={filterQuery} dateQuery={dateQuery} filterTags={filterTags} />
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