import { useRef } from "react";

export type SwipeHandler = () => void;
export type UseSwipeOptions = {
  minDistance?: number;
  maxDuration?: number;
  verticalSensitivity?: number;
  enableMouse?: boolean;
  axis?: "horizontal" | "vertical";
};

export const useSwipe = (
  onSwipeLeft: SwipeHandler,
  onSwipeRight: SwipeHandler,
  options: UseSwipeOptions = {}
) => {
  const {
    minDistance = 50,
    maxDuration = 700,
    verticalSensitivity = 1.5,
    enableMouse = true,
    axis = "vertical",
  } = options;

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);
  const isMouseDown = useRef(false);

  const reset = () => {
    startX.current = null;
    startY.current = null;
    startTime.current = null;
    isMouseDown.current = false;
  };

  const handleSwipe = (dx: number, dy: number, dt: number) => {
    const primary = axis === "vertical" ? dy : dx;
    const secondary = axis === "vertical" ? dx : dy;

    if (Math.abs(primary) < minDistance) return;
    if (dt > maxDuration) return;
    if (Math.abs(primary) < Math.abs(secondary) * verticalSensitivity) return;

    if (primary < 0) {
      // For vertical: negative dy means upward swipe
      if (axis === "vertical") {
        onSwipeLeft(); // caller should treat as 'up'
      } else {
        onSwipeLeft();
      }
    } else {
      if (axis === "vertical") {
        onSwipeRight(); // caller should treat as 'down'
      } else {
        onSwipeRight();
      }
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    startTime.current = Date.now();
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (startX.current == null || startY.current == null || startTime.current == null) {
      reset();
      return;
    }
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;
    const dt = Date.now() - startTime.current;
    handleSwipe(dx, dy, dt);
    reset();
  };

  const onMouseDown = enableMouse
    ? (e: React.MouseEvent) => {
        isMouseDown.current = true;
        startX.current = e.clientX;
        startY.current = e.clientY;
        startTime.current = Date.now();
      }
    : undefined;

  const onMouseUp = enableMouse
    ? (e: React.MouseEvent) => {
        if (!isMouseDown.current) return;
        if (startX.current == null || startY.current == null || startTime.current == null) {
          reset();
          return;
        }
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        const dt = Date.now() - startTime.current;
        handleSwipe(dx, dy, dt);
        reset();
      }
    : undefined;

  return {
    onTouchStart,
    onTouchEnd,
    onMouseDown,
    onMouseUp,
  };
};

export default useSwipe;
