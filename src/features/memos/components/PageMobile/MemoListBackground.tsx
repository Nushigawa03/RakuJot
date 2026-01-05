import React from 'react';
import NavigationBarMobile from '../NavigationBar/NavigationBarMobile';
import MemoFilters from '../MemoFilters';
import MemoList from '../MemoList';
import QuickMemoInput from '../Input/QuickMemoInput';
import { TagExpression } from '../../types/tagExpressions';
import { SearchTag } from '../../types/searchTag';
import './MemoListBackground.css';

interface MemoListBackgroundProps {
    onBackToInput: () => void;
    onSettings: () => void;
    dateQuery: string;
    setDateQuery: (query: string) => void;
    expressions: TagExpression[];
    activeExpression: string;
    handleExpressionClick: (expression: TagExpression) => void;
    filterQuery: string;
    queryEmbedding: number[] | undefined;
    filterTags: SearchTag[];
}

const MemoListBackground: React.FC<MemoListBackgroundProps> = ({
    onBackToInput,
    onSettings,
    dateQuery,
    setDateQuery,
    expressions,
    activeExpression,
    handleExpressionClick,
    filterQuery,
    queryEmbedding,
    filterTags,
}) => {
    return (
        <div className="page-mobile__background">
            <header className="page-mobile__list-header">
                <NavigationBarMobile
                    onBack={onBackToInput}
                    onSettings={onSettings}
                />
            </header>

            <main className="page-mobile__list-main">
                <MemoFilters
                    dateQuery={dateQuery}
                    setDateQuery={setDateQuery}
                    expressions={expressions}
                    activeExpression={activeExpression}
                    handleExpressionClick={handleExpressionClick}
                />
                <MemoList
                    filterQuery={filterQuery}
                    dateQuery={dateQuery}
                    queryEmbedding={queryEmbedding}
                    filterTags={filterTags}
                />
            </main>

            <footer className="page-mobile__list-footer">
                <QuickMemoInput />
            </footer>
        </div>
    );
};

export default MemoListBackground;
