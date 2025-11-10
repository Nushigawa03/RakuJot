import React from "react";
import useSwipe from "../hooks/useSwipe";

type Props = {
  children: React.ReactNode;
  className?: string;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  enableMouse?: boolean;
  axis?: "horizontal" | "vertical";
};

const SwipeArea: React.FC<Props> = ({
  children,
  className,
  onSwipeLeft = () => {},
  onSwipeRight = () => {},
  onSwipeUp,
  onSwipeDown,
  enableMouse = true,
  axis = "vertical",
}) => {
  // Map vertical handlers to left/right callbacks expected by useSwipe
  const leftCb = axis === "vertical" ? onSwipeUp ?? onSwipeLeft : onSwipeLeft;
  const rightCb = axis === "vertical" ? onSwipeDown ?? onSwipeRight : onSwipeRight;

  const handlers = useSwipe(leftCb, rightCb, { enableMouse, axis });

  return (
    <div
      className={className}
      onTouchStart={handlers.onTouchStart}
      onTouchEnd={handlers.onTouchEnd}
      onMouseDown={handlers.onMouseDown}
      onMouseUp={handlers.onMouseUp}
    >
      {children}
    </div>
  );
};

export default SwipeArea;
