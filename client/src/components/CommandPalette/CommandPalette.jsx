import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Moon,
  Sun,
  Globe,
  Tag,
  Building,
  UserPlus,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  Bell,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Download,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useScrollLock } from '../../utils/useScrollLock.js';

export const CommandPalette = ({
  isOpen,
  onClose,
  tasks = [],
  onOpenTaskDetail,
  onOpenNewTask,
  onOpenCategoryManager,
  onOpenCreateOrg,
  onOpenInviteMember,
  onOpenImportExport,
  onFilterChange,
}) => {
  useScrollLock(isOpen);

  const { t, lang, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { activeWorkspace } = useWorkspace();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K and Esc listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Triggered from outside
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Define Quick Actions
  const actions = [
    {
      id: 'new-task',
      title: t('newTask'),
      icon: Plus,
      category: t('actions'),
      perform: () => {
        onClose();
        onOpenNewTask();
      },
    },
    {
      id: 'manage-categories',
      title: t('manageCategories'),
      icon: Tag,
      category: t('actions'),
      perform: () => {
        onClose();
        onOpenCategoryManager();
      },
    },
    {
      id: 'ai-import',
      title: lang === 'fa' ? 'ورود هوشمند تسک‌ها با مارک‌داون AI' : 'AI Markdown Smart Import',
      icon: Sparkles,
      category: t('actions'),
      perform: () => {
        onClose();
        onOpenImportExport?.('import');
      },
    },
    {
      id: 'export-tasks',
      title: lang === 'fa' ? 'خروجی گرفتن از تسک‌ها (Excel & MD)' : 'Export Tasks (Excel & Markdown)',
      icon: Download,
      category: t('actions'),
      perform: () => {
        onClose();
        onOpenImportExport?.('export');
      },
    },
    {
      id: 'toggle-theme',
      title: theme === 'dark' ? 'حالت روشن (Light Mode)' : 'حالت تاریک (Dark Mode)',
      icon: theme === 'dark' ? Sun : Moon,
      category: t('actions'),
      perform: () => {
        onClose();
        toggleTheme();
      },
    },
    {
      id: 'toggle-lang',
      title: lang === 'fa' ? 'Switch to English' : 'تغییر زبان به فارسی',
      icon: Globe,
      category: t('actions'),
      perform: () => {
        onClose();
        setLanguage(lang === 'fa' ? 'en' : 'fa');
      },
    },
    {
      id: 'filter-all',
      title: t('allTasks'),
      icon: CheckCircle2,
      category: t('switchFilter'),
      perform: () => {
        onClose();
        onFilterChange('all');
      },
    },
    {
      id: 'filter-in-progress',
      title: t('quickFilterInProgress'),
      icon: Clock,
      category: t('switchFilter'),
      perform: () => {
        onClose();
        onFilterChange('in-progress');
      },
    },
    {
      id: 'filter-my-tasks',
      title: t('quickFilterMyTasks'),
      icon: UserCheck,
      category: t('switchFilter'),
      perform: () => {
        onClose();
        onFilterChange('my-tasks');
      },
    },
    {
      id: 'filter-due-soon',
      title: t('quickFilterDueSoon'),
      icon: AlertTriangle,
      category: t('switchFilter'),
      perform: () => {
        onClose();
        onFilterChange('due-soon');
      },
    },
    {
      id: 'filter-notifications',
      title: t('notificationsTitle'),
      icon: Bell,
      category: t('switchFilter'),
      perform: () => {
        onClose();
        onFilterChange('notifications');
      },
    },
  ];

  if (activeWorkspace) {
    actions.splice(2, 0, {
      id: 'invite-member',
      title: t('inviteMember'),
      icon: UserPlus,
      category: t('actions'),
      perform: () => {
        onClose();
        onOpenInviteMember();
      },
    });
  } else {
    actions.splice(2, 0, {
      id: 'create-org',
      title: t('createOrg'),
      icon: Building,
      category: t('actions'),
      perform: () => {
        onClose();
        onOpenCreateOrg();
      },
    });
  }

  // Filter Tasks by query
  const q = query.trim().toLowerCase();
  const matchingTasks = q
    ? tasks
        .filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.categoryId?.name && t.categoryId.name.toLowerCase().includes(q))
        )
        .slice(0, 8)
    : [];

  // Filter Actions by query
  const matchingActions = q
    ? actions.filter((a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q))
    : actions;

  // Flattened searchable list for keyboard navigation
  const flatItems = [
    ...matchingTasks.map((t) => ({ type: 'task', data: t })),
    ...matchingActions.map((a) => ({ type: 'action', data: a })),
  ];

  // Handle Keyboard Navigation (ArrowUp, ArrowDown, Enter)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = flatItems[selectedIndex];
      if (current) {
        if (current.type === 'task') {
          onClose();
          onOpenTaskDetail(current.data);
        } else if (current.type === 'action') {
          current.data.perform();
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-md flex items-start justify-center p-3.5 sm:p-6 pt-12 sm:pt-24 animate-in fade-in duration-150 overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[82vh] my-auto sm:my-0 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-200/70 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-brand-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('commandSearchPlaceholder')}
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
              ESC
            </span>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Matching Tasks Section */}
          {matchingTasks.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t('foundTasks')} ({matchingTasks.length})
              </p>
              <div className="space-y-1 mt-1">
                {matchingTasks.map((task, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={task._id}
                      onClick={() => {
                        onClose();
                        onOpenTaskDetail(task);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs text-start transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-white' : 'text-brand-500'
                          }`}
                        />
                        <span className="font-bold truncate">{task.title}</span>
                        {task.categoryId && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                            style={{
                              backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${task.categoryId.color}20`,
                              color: isSelected ? '#fff' : task.categoryId.color,
                            }}
                          >
                            {task.categoryId.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ms-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {t(task.status)}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions Section */}
          {matchingActions.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {q ? t('actions') : t('quickCommands')}
              </p>
              <div className="space-y-1 mt-1">
                {matchingActions.map((action, idx) => {
                  const globalIdx = matchingTasks.length + idx;
                  const isSelected = selectedIndex === globalIdx;
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.perform}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-xs text-start transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-white shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-brand-500/10 text-brand-500 dark:text-brand-400'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="font-semibold">{action.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-medium opacity-60 ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {action.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {flatItems.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-semibold">{t('noResultsFound')}</p>
            </div>
          )}
        </div>

        {/* Footer info hints */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ برای جابه‌جایی</span>
            <span>↵ برای انتخاب</span>
            <span>ESC برای بستن</span>
          </div>
          <span className="font-semibold text-brand-600 dark:text-brand-400">TaskManager Pro</span>
        </div>
      </div>
    </div>
  );
};
