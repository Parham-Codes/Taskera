import { useEffect } from 'react';

/**
 * Universal scroll-lock hook to completely eliminate background page scrolling
 * when modals, drawers, or command palettes are open.
 */
export const useScrollLock = (isLocked) => {
  useEffect(() => {
    if (!isLocked) return;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    // Lock both HTML and BODY to ensure cross-browser compatibility
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [isLocked]);
};
