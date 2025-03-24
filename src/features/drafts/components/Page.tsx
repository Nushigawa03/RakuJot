import React, { useState } from 'react';
import NavigationBar from './NavigationBar/NavigationBar';
import MemoList from './MemoList';
import Sidebar from './Sidebar';
import QuickMemoInput from './QuickMemoInput';
import RecommendationSection from './RecommendationSection';
import './Page.css';

const Page: React.FC = () => {
  const [filterQuery, setFilterQuery] = useState<string>('');

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
          <MemoList filterQuery={filterQuery} />
        </section>
        <aside className="recommendation-section">
          <RecommendationSection />
        </aside>
      </div>
      <footer>
        <QuickMemoInput />
      </footer>
    </div>
  );
};

export default Page;