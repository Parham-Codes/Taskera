import React from 'react';
import { FileSpreadsheet, FileText, Check, Copy } from 'lucide-react';

export const TaskExportTab = ({
  tasks = [],
  lang,
  onDownloadCSV,
  onDownloadMarkdown,
  onCopyMarkdown,
  copiedMarkdown,
}) => {
  return (
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
          onClick={onDownloadCSV}
          disabled={tasks.length === 0}
          className="p-4 rounded-2xl glass-panel hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all border border-slate-200/80 dark:border-slate-800 text-start space-y-2 group disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
          onClick={onDownloadMarkdown}
          disabled={tasks.length === 0}
          className="p-4 rounded-2xl glass-panel hover:border-brand-500/50 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all border border-slate-200/80 dark:border-slate-800 text-start space-y-2 group disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
          onClick={onCopyMarkdown}
          disabled={tasks.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 glass-input hover:border-brand-500/50 transition-all border border-slate-200/80 dark:border-slate-800 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
  );
};

