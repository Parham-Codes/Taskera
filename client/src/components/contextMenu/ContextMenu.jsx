import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Reusable Context Menu Submenu Component rendered via createPortal
 */
const ContextSubmenu = ({
  items,
  parentRect,
  lang,
  onCloseParent,
}) => {
  const subRef = useRef(null);
  const isRtl = lang === 'fa';

  // Compute initial synchronous estimate so it never mounts at (0,0)
  const initialLeft = parentRect
    ? (isRtl ? parentRect.left - 185 - 4 : parentRect.right + 4)
    : 0;
  const initialTop = parentRect ? parentRect.top : 0;

  const [coords, setCoords] = useState({ top: initialTop, left: initialLeft });

  useLayoutEffect(() => {
    if (!parentRect || !subRef.current) return;
    const subEl = subRef.current;
    const subRect = subEl.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = isRtl
      ? parentRect.left - subRect.width - 4
      : parentRect.right + 4;

    // Flip horizontally if out of bounds
    if (!isRtl && left + subRect.width > viewportW - 8) {
      left = parentRect.left - subRect.width - 4;
    } else if (isRtl && left < 8) {
      left = parentRect.right + 4;
    }

    // Keep within viewport boundaries
    left = Math.max(8, Math.min(left, viewportW - subRect.width - 8));

    let top = parentRect.top;
    if (top + subRect.height > viewportH - 8) {
      top = Math.max(8, viewportH - subRect.height - 8);
    }

    setCoords({ top, left });
  }, [parentRect, isRtl]);

  return createPortal(
    <div
      ref={subRef}
      data-context-submenu="true"
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        minWidth: '185px',
        maxWidth: '280px',
      }}
      role="menu"
      tabIndex={-1}
      className="fixed z-[10001] p-1.5 rounded-2xl glass-panel bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-[75vh] overflow-y-auto select-none"
    >
      {items.map((item, idx) => {
        if (item.separator || item.type === 'separator') {
          return (
            <div
              key={idx}
              className="my-1 border-t border-slate-200/60 dark:border-slate-800/80"
              role="separator"
            />
          );
        }

        const Icon = item.icon;
        const isDisabled = Boolean(item.disabled);
        const isDanger = Boolean(item.danger);
        const isActive = Boolean(item.active);

        return (
          <button
            key={item.id || idx}
            type="button"
            role="menuitem"
            disabled={isDisabled}
            aria-disabled={isDisabled}
            onClick={(e) => {
              e.stopPropagation();
              if (isDisabled) return;
              item.onClick?.(e);
              onCloseParent?.();
            }}
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-start cursor-pointer ${
              isDisabled
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : isDanger
                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-98'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-brand-600 dark:hover:text-brand-400 active:scale-98'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {item.colorDot ? (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-white/40 dark:border-slate-800/40"
                  style={{ backgroundColor: item.colorDot }}
                />
              ) : Icon ? (
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    item.iconColor
                      ? item.iconColor
                      : isDanger
                      ? 'text-rose-500'
                      : 'text-slate-400 group-hover:text-brand-500'
                  }`}
                />
              ) : null}

              <span className="truncate">{item.label}</span>
            </div>

            {isActive && (
              <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />
            )}
          </button>
        );
      })}
    </div>,
    document.body
  );
};

/**
 * Universal Context Menu Component
 * Renders cleanly in a Document Portal with collision clamping, submenus, and keyboard support.
 */
export const ContextMenu = ({
  isOpen,
  x = 0,
  y = 0,
  onClose,
  items = [],
  title = null,
  minWidth = 210,
}) => {
  const { lang } = useLanguage();
  const isRtl = lang === 'fa';

  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: y, left: x });
  const [activeSubmenuId, setActiveSubmenuId] = useState(null);
  const [parentItemRect, setParentItemRect] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const submenuCloseTimerRef = useRef(null);

  // Filter actionable menu items for keyboard navigation
  const actionableItems = items.filter(
    (item) => !item.separator && item.type !== 'separator' && !item.disabled
  );

  // Smart Viewport Collision Detection for Main Menu
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const el = menuRef.current;
    const rect = el.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let computedX = x;
    let computedY = y;

    // If opening near right edge, flip inwards
    if (computedX + rect.width > viewportW - 10) {
      computedX = Math.max(10, viewportW - rect.width - 10);
    }
    // If opening near left edge
    if (computedX < 10) {
      computedX = 10;
    }

    // If opening near bottom edge, flip upwards
    if (computedY + rect.height > viewportH - 10) {
      computedY = Math.max(10, viewportH - rect.height - 10);
    }
    // If opening near top edge
    if (computedY < 10) {
      computedY = 10;
    }

    setPosition({ top: computedY, left: computedX });
    setFocusedIndex(-1);
    setActiveSubmenuId(null);
  }, [isOpen, x, y]);

  // Handle Outside Click, Escape, and Window Resize/Scroll
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let timerId = null;

    const handlePointerDown = (e) => {
      // Ignore if pointer is within main menu or any submenu
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (document.querySelector('[data-context-submenu]')?.contains(e.target)) return;
      onClose?.();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    const handleScrollOrResize = (e) => {
      // Ignore scroll inside the context menu itself or any submenu
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (document.querySelector('[data-context-submenu]')?.contains(e.target)) return;
      onClose?.();
    };

    // Attach listeners after current tick to avoid immediate close from triggering event
    timerId = setTimeout(() => {
      if (!isMounted) return;
      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }, 50);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      if (submenuCloseTimerRef.current) clearTimeout(submenuCloseTimerRef.current);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, onClose]);

  // Keyboard Navigation inside Menu
  const handleMenuKeyDown = (e) => {
    if (!isOpen || actionableItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % actionableItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + actionableItems.length) % actionableItems.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setFocusedIndex(actionableItems.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < actionableItems.length) {
        const item = actionableItems[focusedIndex];
        if (item.children?.length > 0) {
          setActiveSubmenuId(item.id);
        } else {
          item.onClick?.(e);
          onClose?.();
        }
      }
    }
  };

  if (!isOpen) return null;

  const activeSubmenuItem = items.find((it) => it.id === activeSubmenuId && Array.isArray(it.children));

  return createPortal(
    <>
      <div
        ref={menuRef}
        role="menu"
        tabIndex={-1}
        onKeyDown={handleMenuKeyDown}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          minWidth: `${minWidth}px`,
          maxWidth: '300px',
        }}
        className="fixed z-[9999] p-1.5 rounded-2xl glass-panel bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto select-none focus:outline-none"
      >
        {/* Optional Title Header */}
        {title && (
          <div className="px-3 py-1.5 mb-1 border-b border-slate-200/60 dark:border-slate-800/80">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
              {title}
            </p>
          </div>
        )}

        {items.map((item, idx) => {
          if (item.separator || item.type === 'separator') {
            return (
              <div
                key={idx}
                className="my-1 border-t border-slate-200/60 dark:border-slate-800/80"
                role="separator"
              />
            );
          }

          const Icon = item.icon;
          const isDisabled = Boolean(item.disabled);
          const isDanger = Boolean(item.danger);
          const isActive = Boolean(item.active);
          const hasSubmenu = Array.isArray(item.children) && item.children.length > 0;
          const isSubOpen = activeSubmenuId === item.id;

          return (
            <div
              key={item.id || idx}
              className="relative"
              onMouseEnter={(e) => {
                if (submenuCloseTimerRef.current) {
                  clearTimeout(submenuCloseTimerRef.current);
                }
                if (hasSubmenu && !isDisabled) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setParentItemRect(rect);
                  setActiveSubmenuId(item.id);
                } else {
                  setActiveSubmenuId(null);
                }
              }}
            >
              <button
                type="button"
                role="menuitem"
                disabled={isDisabled}
                aria-disabled={isDisabled}
                aria-haspopup={hasSubmenu ? 'true' : undefined}
                aria-expanded={hasSubmenu ? isSubOpen : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDisabled) return;
                  if (hasSubmenu) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setParentItemRect(rect);
                    setActiveSubmenuId((prev) => (prev === item.id ? null : item.id));
                    return;
                  }
                  item.onClick?.(e);
                  onClose?.();
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-start cursor-pointer group ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : isDanger
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-98'
                    : isSubOpen
                    ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-brand-600 dark:hover:text-brand-400 active:scale-98'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.colorDot ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs border border-white/40 dark:border-slate-800/40"
                      style={{ backgroundColor: item.colorDot }}
                    />
                  ) : Icon ? (
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        item.iconColor
                          ? item.iconColor
                          : isDanger
                          ? 'text-rose-500'
                          : isSubOpen
                          ? 'text-brand-500'
                          : 'text-slate-400 group-hover:text-brand-500'
                      }`}
                    />
                  ) : null}

                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  )}

                  {item.shortcut && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter hidden sm:inline">
                      {item.shortcut}
                    </span>
                  )}

                  {hasSubmenu && (
                    isRtl ? (
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Render Active Submenu cleanly through Portal outside overflow constraints */}
      {activeSubmenuItem && parentItemRect && (
        <ContextSubmenu
          items={activeSubmenuItem.children}
          parentRect={parentItemRect}
          lang={lang}
          onCloseParent={onClose}
        />
      )}
    </>,
    document.body
  );
};
