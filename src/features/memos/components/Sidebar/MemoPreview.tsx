import React from 'react';
import './MemoPreview.css';

interface MemoPreviewProps {
  memo: {
    id: string;
    title: string;
    body: string;
    date?: string;
    tags?: { id: string; name: string }[];
  } | null;
}

export const MemoPreview: React.FC<MemoPreviewProps> = ({ memo }) => {
  if (!memo) {
    return (
      <div className="memo-preview-container empty">
        <div className="preview-placeholder">
          <p>📝</p>
          <p>メモにカーソルを合わせると</p>
          <p>内容がここに表示されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="memo-preview-container">
      <div className="preview-header">
        <h2 className="preview-title">{memo.title}</h2>
        {memo.date && <div className="preview-date">{memo.date}</div>}
        {memo.tags && memo.tags.length > 0 && (
          <div className="preview-tags">
            {memo.tags.map((tag) => (
              <span key={tag.id} className="preview-tag">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="preview-body">
        {memo.body.split('\n').map((line, i) => (
          <p key={i}>{line || '\u00A0'}</p>
        ))}
      </div>
    </div>
  );
};

export default MemoPreview;
