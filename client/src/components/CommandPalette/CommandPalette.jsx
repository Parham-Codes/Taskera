import React, { useState, useEffect } from 'react';
import {
  Zap,
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
  Sparkles,
  Download,
  X,
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

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset index on open
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K and Esc listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
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

  // Handle Keyboard Navigation (ArrowUp, ArrowDown, Enter)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, actions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + actions.length) % Math.max(1, actions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = actions[selectedIndex];
      if (current) {
        current.perform();
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, actions]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-md flex items-start justify-center p-3.5 sm:p-6 pt-12 sm:pt-20 animate-in fade-in duration-150 overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[82vh] my-auto sm:my-0 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Quick Access Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'fa' ? 'دسترسی سریع' : 'Quick Access'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'fa' ? 'عملیات‌ها و میانبرهای پرکاربرد' : 'Shortcuts and common operations'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Actions List */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
          {actions.map((action, idx) => {
            const isSelected = selectedIndex === idx;
            const IconComponent = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.perform}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-start transition-all ${
                  isSelected
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-brand-500/10 text-brand-500 dark:text-brand-400'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="font-semibold truncate">{action.title}</span>
                </div>
                <span
                  className={`text-[10px] font-medium opacity-60 shrink-0 ms-2 ${
                    isSelected ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {action.category}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer info hints */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ برای جابه‌جایی</span>
            <span>↵ برای انتخاب</span>
            <span>ESC برای بستن</span>
          </div>
          <span className="font-semibold text-brand-600 dark:text-brand-400">Taskera</span>
        </div>
      </div>
    </div>
  );
};
