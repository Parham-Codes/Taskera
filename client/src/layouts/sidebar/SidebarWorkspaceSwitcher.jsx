import React, { useState, useRef, useEffect } from 'react';
import { Building2, User, ChevronDown, Check, Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const SidebarWorkspaceSwitcher = ({
  activeWorkspace,
  workspaces = [],
  switchWorkspace,
  onOpenCreateOrg,
  onCloseSidebar,
  t,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPersonalSelected =
    location.pathname === '/personal' || activeWorkspace === null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-2xl glass-input hover:border-brand-500/40 transition-all text-xs font-semibold shadow-xs cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          {activeWorkspace ? (
            <div className="w-6 h-6 rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
          )}
          <div className="text-start truncate">
            <p className="truncate leading-tight">
              {activeWorkspace ? activeWorkspace.name : t('personalSpace')}
            </p>
            <p className="text-[10px] text-slate-400 font-normal leading-tight">
              {activeWorkspace ? `${activeWorkspace.role}` : t('soloMode')}
            </p>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full start-0 end-0 mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {t('workspaces')}
          </div>

          {/* Personal Space */}
          <button
            type="button"
            onClick={() => {
              switchWorkspace(null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-start transition-colors cursor-pointer ${
              isPersonalSelected
                ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('personalSpace')}</span>
            </div>
            {isPersonalSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
          </button>

          {/* Team Workspaces */}
          {workspaces.map((org) => {
            const orgId = org.id || org._id;
            const isSelected =
              location.pathname === `/teams/${orgId}` ||
              (activeWorkspace?.id || activeWorkspace?._id) === orgId;

            return (
              <button
                key={orgId}
                type="button"
                onClick={() => {
                  switchWorkspace(org);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-start transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  <span className="truncate">{org.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
              </button>
            );
          })}

          <div className="my-1 border-t border-slate-200/60 dark:border-slate-800" />

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenCreateOrg();
              onCloseSidebar?.();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-brand-600 dark:text-brand-400 hover:bg-brand-50/70 dark:hover:bg-brand-950/30 transition-colors font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('newWorkspace')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

