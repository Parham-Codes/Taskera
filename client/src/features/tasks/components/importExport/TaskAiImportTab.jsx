import React from 'react';
import { Sparkles, Check, Copy, Upload, AlertCircle } from 'lucide-react';

export const TaskAiImportTab = ({
  markdownInput,
  setMarkdownInput,
  parsedPreviewTasks = [],
  errorMsg,
  setErrorMsg,
  copiedPrompt,
  onCopyPrompt,
  onFileUpload,
  lang,
  t,
}) => {
  return (
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
          onClick={onCopyPrompt}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
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
              onChange={onFileUpload}
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
            {parsedPreviewTasks.map((taskItem, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <p className="font-extrabold text-slate-900 dark:text-slate-100 truncate">
                    {taskItem.title}
                  </p>
                  {taskItem.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {taskItem.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {taskItem.priority}
                    </span>
                    {taskItem.categoryName && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        {taskItem.categoryName}
                      </span>
                    )}
                    {taskItem.dueDate && (
                      <span className="text-[10px] text-slate-400">
                        {taskItem.dueDate}
                      </span>
                    )}
                  </div>
                </div>

                {taskItem.subtasks?.length > 0 && (
                  <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {taskItem.subtasks.length} {lang === 'fa' ? 'زیرتسک' : 'subtasks'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

