import { useState, useRef, useEffect, RefObject } from 'react';

export interface DragHandlers {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
}

export interface UseDragOverlayResult {
    inputOffset: number;
    setInputOffset: (offset: number) => void;
    isDragging: boolean;
    dragHandlers: DragHandlers;
}

export const useDragOverlay = (containerRef: RefObject<HTMLDivElement | null>): UseDragOverlayResult => {
    const [inputOffset, setInputOffset] = useState(0); // 0 = fully up, 1 = fully down
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(0);
    const dragStartOffset = useRef(0);
    const maxDragOffset = useRef(0);

    const handleDragStart = (clientY: number) => {
        setIsDragging(true);
        dragStartY.current = clientY;
        dragStartOffset.current = inputOffset;
        maxDragOffset.current = 0; // Reset max drag distance
    };

    const handleDragMove = (clientY: number) => {
        if (!isDragging || !containerRef.current) return;

        const deltaY = clientY - dragStartY.current;
        const containerHeight = containerRef.current.clientHeight;
        const dragRatio = deltaY / containerHeight;

        let newOffset = dragStartOffset.current + dragRatio;
        newOffset = Math.max(0, Math.min(1, newOffset)); // Clamp between 0 and 1

        // Track maximum movement distance
        maxDragOffset.current = Math.max(maxDragOffset.current, Math.abs(newOffset - dragStartOffset.current));

        setInputOffset(newOffset);
    };

    const handleDragEnd = () => {
        setIsDragging(false);

        // Treat as tap ONLY if we haven't moved much during the entire interaction
        if (maxDragOffset.current < 0.01) {
            if (dragStartOffset.current < 0.5) {
                setInputOffset(1);
            }
        } else {
            // Existing drag logic
            if (inputOffset > 0.20) {
                setInputOffset(1); // Snap down
            } else {
                setInputOffset(0); // Snap up
            }
        }
    };

    // Mouse events
    const onMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        handleDragStart(e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
        handleDragMove(e.clientY);
    };

    const onMouseUp = () => {
        handleDragEnd();
    };

    // Touch events
    const onTouchStart = (e: React.TouchEvent) => {
        // Prevent default to avoid ghost mouse clicks (0->1->0 bug)
        if (e.cancelable) e.preventDefault();

        if (e.touches.length === 1) {
            handleDragStart(e.touches[0].clientY);
        }
    };

    const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
            handleDragMove(e.touches[0].clientY);
        }
    };

    const onTouchEnd = () => {
        handleDragEnd();
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onTouchEnd);

            return () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                window.removeEventListener('touchmove', onTouchMove);
                window.removeEventListener('touchend', onTouchEnd);
            };
        }
    }, [isDragging, inputOffset]);

    return {
        inputOffset,
        setInputOffset,
        isDragging,
        dragHandlers: {
            onMouseDown,
            onTouchStart,
        },
    };
};
