import React, { useState, useMemo } from 'react';
import { X, Upload, Download, Sparkles } from 'lucide-react';
import { api } from '../../api/client.js';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useCategories } from '../../context/CategoryContext.jsx';
import {
  parseMarkdownTasks,
  generateMarkdownFromTasks,
  generateCSVFromTasks,
  READY_AI_PROMPT_TEMPLATE,
} from '../../utils/markdownTaskParser.js';
import { useScrollLock } from '../../utils/useScrollLock.js';
import { TaskAiImportTab, TaskExportTab } from './components/importExport/index.js';

export const TaskImportExportModal = ({
  isOpen,
  onClose,
  tasks = [],
  onTasksImported,
  initialTab = 'import',
}) => {
  useScrollLock(isOpen);

  const { activeWorkspace } = useWorkspace();
  const { t, lang } = useLanguage();
  const { fetchCategories } = useCategories();

  const [activeTab, setActiveTab] = useState(initialTab); // 'import' | 'export'
  const [markdownInput, setMarkdownInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live parsed preview of markdown input
  const parsedPreviewTasks = useMemo(() => {
    return parseMarkdownTasks(markdownInput);
  }, [markdownInput]);

  if (!isOpen) return null;

  // 1. Handle Copy Prompt for AI
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(READY_AI_PROMPT_TEMPLATE);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  // 2. Handle File Upload (.md or .txt)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setMarkdownInput(content);
        setErrorMsg('');
      }
    };
    reader.readAsText(file);
  };

  // 3. Handle Batch Import
  const handleImportSubmit = async () => {
    if (parsedPreviewTasks.length === 0) {
      setErrorMsg(lang === 'fa' ? 'هیچ تسک معتبری در متن پیدا نشد.' : 'No valid tasks found in markdown.');
      return;
    }

    setIsImporting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/tasks/batch', {
        tasks: parsedPreviewTasks,
        organizationId: (activeWorkspace?.id || activeWorkspace?._id) || null,
      });

      if (res.data?.success) {
        const imported = res.data.data.tasks || [];
        onTasksImported?.(imported);
        fetchCategories();
        onClose();
        setMarkdownInput('');
      }
    } catch (err) {
      console.error('Failed to import tasks:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to import tasks. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // 4. Handle Download CSV / Excel
  const handleDownloadCSV = () => {
    const csvContent = generateCSVFromTasks(tasks);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 5. Handle Download Markdown (.md)
  const handleDownloadMarkdown = () => {
    const mdContent = generateMarkdownFromTasks(tasks, lang);
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks_export_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 6. Handle Copy Markdown to Clipboard
  const handleCopyMarkdown = async () => {
    const mdContent = generateMarkdownFromTasks(tasks, lang);
    try {
      await navigator.clipboard.writeText(mdContent);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2500);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain">
      <div className="w-full max-w-3xl my-auto bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                {lang === 'fa' ? 'تبادل داده و ورود هوشمند با AI' : 'AI Data Exchange & Smart Import'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'fa'
                  ? 'ورود دسته‌ای تسک‌ها با مارک‌داون هوش مصنوعی و خروجی اکسل/MD'
                  : 'Batch import AI markdown tasks or export to Excel/MD'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200/60 dark:border-slate-800 px-5 pt-2 gap-4 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{lang === 'fa' ? 'ورود هوشمند با مارک‌داون AI' : 'AI Markdown Import'}</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'fa' ? 'خروجی اکسل و مارک‌داون' : 'Export Excel & MD'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'import' ? (
            <TaskAiImportTab
              markdownInput={markdownInput}
              setMarkdownInput={setMarkdownInput}
              parsedPreviewTasks={parsedPreviewTasks}
              errorMsg={errorMsg}
              setErrorMsg={setErrorMsg}
              copiedPrompt={copiedPrompt}
              onCopyPrompt={handleCopyPrompt}
              onFileUpload={handleFileUpload}
              lang={lang}
              t={t}
            />
          ) : (
            <TaskExportTab
              tasks={tasks}
              lang={lang}
              onDownloadCSV={handleDownloadCSV}
              onDownloadMarkdown={handleDownloadMarkdown}
              onCopyMarkdown={handleCopyMarkdown}
              copiedMarkdown={copiedMarkdown}
            />
          )}
        </div>

        {/* Modal Footer (for Import Tab) */}
        {activeTab === 'import' && (
          <div className="p-4 sm:p-5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
            <span className="text-xs text-slate-400 font-semibold">
              {parsedPreviewTasks.length > 0
                ? lang === 'fa'
                  ? `${parsedPreviewTasks.length} تسک آماده ثبت در فضای کاری است.`
                  : `${parsedPreviewTasks.length} tasks ready to create.`
                : lang === 'fa'
                ? 'متن را Paste کنید تا تسک‌ها شناسایی شوند.'
                : 'Paste markdown to extract tasks.'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>

              <button
                type="button"
                disabled={parsedPreviewTasks.length === 0 || isImporting}
                onClick={handleImportSubmit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-95 transition-all shadow-md shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isImporting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>
                  {lang === 'fa'
                    ? `ثبت و ایجاد ${parsedPreviewTasks.length} تسک`
                    : `Create ${parsedPreviewTasks.length} Tasks`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
