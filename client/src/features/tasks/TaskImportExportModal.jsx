import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  Download,
  FileText,
  FileSpreadsheet,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Layers,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
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
        // Refresh categories if new ones were auto-created
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
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200/60 dark:border-slate-800 px-5 pt-2 gap-4 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all ${
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
            className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all ${
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
            /* =========================================================================
               TAB 1: AI MARKDOWN IMPORT
               ========================================================================= */
            <div className="space-y-4">
              {/* Ready Prompt Copier Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-brand-500/10 via-indigo-500/10 to-purple-500/10 border border-brand-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                    {lang === 'fa'
                      ? 'می‌خواهید تسک‌ها را هوش مصنوعی برایتان بنویسد؟ پرامپت آماده را کپی کنید:'
                      : 'Want AI to structure your project tasks? Copy our prompt template:'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-95 transition-all shadow-xs shrink-0"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>{lang === 'fa' ? 'کپی شد!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'fa' ? 'کپی پرامپت آماده AI' : 'Copy AI Prompt'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Textarea & Drag File Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'fa' ? 'متن مارک‌داون تسک‌ها:' : 'Markdown Task Content:'}
                  </label>
                  <label className="text-xs text-brand-600 dark:text-brand-400 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{lang === 'fa' ? 'انتخاب فایل .md' : 'Upload .md file'}</span>
                    <input
                      type="file"
                      accept=".md,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  value={markdownInput}
                  onChange={(e) => {
                    setMarkdownInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  rows={7}
                  dir="auto"
                  placeholder={
                    lang === 'fa'
                      ? `# تسک: پیاده‌سازی فرم پرداخت
- اولویت: بالا
- دسته‌بندی: فرانت‌اند
- موعد: 2026-10-30

## توضیحات
طراحی و تست فرم پرداخت زرین‌پال...

## زیرتسک‌ها
- [ ] ساخت کامپوننت فرم
- [ ] اتصال به درگاه
- [ ] تست خطاها

---

# تسک: تست نهایی دیتابیس...`
                      : `# Task: Payment Gateway Integration\n- Priority: high\n- Category: Backend\n- Due: 2026-10-30\n\n## Description\nIntegrate Stripe webhook...\n\n## Subtasks\n- [ ] Setup webhook listener\n- [ ] Database updates`
                  }
                  className="w-full p-3 text-xs font-mono rounded-2xl glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none leading-relaxed"
                />
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Live Parsed Preview */}
              {parsedPreviewTasks.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {lang === 'fa'
                        ? `پیش‌نمایش استخراج‌شده (${parsedPreviewTasks.length} تسک آماده ساخت):`
                        : `Extracted Preview (${parsedPreviewTasks.length} tasks ready):`}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {lang === 'fa' ? 'ساختار معتبر است' : 'Valid Format'}
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-2 pe-1">
                    {parsedPreviewTasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                            {t.title}
                          </p>
                          {t.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {t.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {t.priority}
                            </span>
                            {t.categoryName && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400">
                                {t.categoryName}
                              </span>
                            )}
                            {t.dueDate && (
                              <span className="text-[10px] text-slate-400">
                                {t.dueDate}
                              </span>
                            )}
                          </div>
                        </div>

                        {t.subtasks?.length > 0 && (
                          <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {t.subtasks.length} {lang === 'fa' ? 'زیرتسک' : 'subtasks'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* =========================================================================
               TAB 2: EXPORT TASKS
               ========================================================================= */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {lang === 'fa' ? 'تعداد تسک‌های آماده برای خروجی:' : 'Tasks Ready for Export:'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {lang === 'fa'
                      ? 'شامل تمامی جزئیات، زمان‌های ثبت‌شده، زیرتسک‌ها و وضعیت‌ها'
                      : 'Includes all attributes, time logs, subtasks, and statuses'}
                  </p>
                </div>
                <span className="text-base font-extrabold px-3 py-1 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 border border-brand-500/30">
                  {tasks.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Download Excel / CSV */}
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  disabled={tasks.length === 0}
                  className="p-4 rounded-2xl glass-panel hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all border border-slate-200/80 dark:border-slate-800 text-start space-y-2 group disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {lang === 'fa' ? 'خروجی فایل Excel / CSV' : 'Export Excel / CSV'}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'fa'
                        ? 'فرمت جدول استاندارد با انکودینگ UTF-8 برای اکسل'
                        : 'Standard spreadsheet format with UTF-8 BOM encoding'}
                    </p>
                  </div>
                </button>

                {/* Download Markdown */}
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  disabled={tasks.length === 0}
                  className="p-4 rounded-2xl glass-panel hover:border-brand-500/50 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all border border-slate-200/80 dark:border-slate-800 text-start space-y-2 group disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      {lang === 'fa' ? 'دانلود فایل Markdown (.md)' : 'Download Markdown (.md)'}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'fa'
                        ? 'مناسب برای ذخیره در ابسیدین یا انتقال به ابزارهای دیگر'
                        : 'Perfect for Obsidian, GitHub, or AI prompts'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Copy Markdown directly */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  disabled={tasks.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 glass-input hover:border-brand-500/50 transition-all border border-slate-200/80 dark:border-slate-800 disabled:opacity-50"
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {lang === 'fa' ? 'کل متن در کلیپ‌بورد کپی شد!' : 'Markdown copied to clipboard!'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>
                        {lang === 'fa'
                          ? 'کپی متن کامل Markdown در کلیپ‌بورد (جهت ارائه به هوش مصنوعی)'
                          : 'Copy full Markdown to clipboard (to feed into AI)'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t('cancel')}
              </button>

              <button
                type="button"
                disabled={parsedPreviewTasks.length === 0 || isImporting}
                onClick={handleImportSubmit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-95 transition-all shadow-md shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
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
