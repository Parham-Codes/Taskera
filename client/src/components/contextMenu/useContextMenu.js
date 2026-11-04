import { useState, useRef, useCallback } from 'react';

/**
 * Hook to manage Context Menu state, positioning, and mobile long-press gestures.
 */
export const useContextMenu = () => {
  const [menuState, setMenuState] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    data: null,
  });

  const touchTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  const open = useCallback((e, data = null) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }

    let clientX = e?.clientX;
    let clientY = e?.clientY;

    // Handle touch events if clientX is undefined
    if (clientX === undefined && e?.touches?.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (clientX === undefined && e?.changedTouches?.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    // Default to center if completely undefined
    if (clientX === undefined || clientY === undefined) {
      clientX = window.innerWidth / 2;
      clientY = window.innerHeight / 2;
    }

    setMenuState({
      isOpen: true,
      x: clientX,
      y: clientY,
      data,
    });
  }, []);

  const close = useCallback(() => {
    setMenuState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
  }, []);

  /**
   * Helper to bind touch events for mobile Long-Press gesture.
   * Cancels cleanly if user scrolls or initiates Drag & Drop.
   */
  const bindLongPress = useCallback(
    (data = null) => {
      const handleTouchStart = (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const touch = e.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

        if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

        touchTimerRef.current = setTimeout(() => {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            try {
              navigator.vibrate(35);
            } catch {
              // safe fallback
            }
          }
          open(touch, data);
        }, 550);
      };

      const handleTouchMove = (e) => {
        if (!touchTimerRef.current) return;
        if (!e.touches || e.touches.length !== 1) {
          clearTimeout(touchTimerRef.current);
          return;
        }

        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

        // If moved more than 8px, cancel long-press (user is scrolling or dragging)
        if (dx > 8 || dy > 8) {
          clearTimeout(touchTimerRef.current);
          touchTimerRef.current = null;
        }
      };

      const handleTouchEnd = () => {
        if (touchTimerRef.current) {
          clearTimeout(touchTimerRef.current);
          touchTimerRef.current = null;
        }
      };

      return {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchEnd,
      };
    },
    [open]
  );

  return {
    isOpen: menuState.isOpen,
    x: menuState.x,
    y: menuState.y,
    position: { x: menuState.x, y: menuState.y },
    data: menuState.data,
    open,
    close,
    bindLongPress,
  };
};

