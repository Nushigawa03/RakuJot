import React from 'react';
import './DragHandle.css';

interface DragHandleProps {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
}

const DragHandle: React.FC<DragHandleProps> = ({ onMouseDown, onTouchStart }) => {
    return (
        <div
            className="page-mobile__handle-card"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
        >
            <div className="page-mobile__handle" />
            <div className="page-mobile__handle-text">
                {'タップでメモ一覧を表示'}
            </div>
        </div>
    );
};

export default DragHandle;
