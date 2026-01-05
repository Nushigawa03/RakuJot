import React from 'react';
import DragHandle from './DragHandle';
import FullScreenMemoInput from '../Input/FullScreenMemoInput';
import './InputOverlay.css';

interface InputOverlayProps {
    inputOffset: number;
    isDragging: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
}

const InputOverlay: React.FC<InputOverlayProps> = ({
    inputOffset,
    isDragging,
    onMouseDown,
    onTouchStart,
}) => {
    return (
        <div
            className={`page-mobile__input-overlay ${isDragging ? 'dragging' : ''}`}
            style={{
                transform: `translateY(${inputOffset * 100}%)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            <DragHandle
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
            />

            <div className="page-mobile__input-content">
                <FullScreenMemoInput />
            </div>
        </div>
    );
};

export default InputOverlay;
