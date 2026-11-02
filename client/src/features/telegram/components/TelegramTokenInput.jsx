import React from 'react';
import { Key, Trash2, AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';

export const TelegramTokenInput = ({
  botToken,
  setBotToken,
  botTokenConfigured,
  clearCustomToken,
  setClearCustomToken,
  lang,
  t,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {t('telegramBotTokenLabel')}
        </label>

        {/* Status indicator and clear button */}
        {botTokenConfigured && !clearCustomToken && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Key className="w-3 h-3" />
              <span>{t('telegramCustomTokenActive')}</span>
            </span>
            <button
              type="button"
              onClick={() => setClearCustomToken(true)}
              className="text-[11px] text-red-500 hover:text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t('telegramRemoveCustomToken')}</span>
            </button>
          </div>
        )}

        {clearCustomToken && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-3 h-3" />
              <span>{t('telegramCustomTokenMarkedForRemoval')}</span>
            </span>
            <button
              type="button"
              onClick={() => setClearCustomToken(false)}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t('telegramUndoRemoval')}</span>
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <input
          type="password"
          dir="ltr"
          value={botToken}
          onChange={(e) => {
            setBotToken(e.target.value);
            if (clearCustomToken) setClearCustomToken(false);
          }}
          placeholder={
            botTokenConfigured && !clearCustomToken
              ? t('telegramBotTokenConfiguredPlaceholder')
              : t('telegramBotTokenPlaceholder')
          }
          className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
      </div>
      <div className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
        {lang === 'fa' ? (
          <>
            <span className="font-bold text-slate-700 dark:text-slate-300">راهنما:</span>{' '}
            {botTokenConfigured && !clearCustomToken
              ? 'توکن اختصاصی شما ذخیره است. در صورت خالی گذاشتن این کادر، توکن قبلی حفظ می‌شود. اگر می‌خواهید از ربات پیش‌فرض تسکرا استفاده کنید، روی «حذف توکن اختصاصی» کلیک کنید.'
              : (
                <>
                  اگر توکن وارد نکنید، از ربات پیش‌فرض تسکرا استفاده می‌شود. کافیست ابتدا به آیدی{' '}
                  <a
                    href="https://t.me/Taskeraaa_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    @Taskeraaa_Bot
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  بروید و یک‌بار دکمه <span className="font-semibold text-slate-800 dark:text-slate-200">Start</span> را بزنید.
                </>
              )}
          </>
        ) : (
          <>
            <span className="font-bold text-slate-700 dark:text-slate-300">Help:</span>{' '}
            {botTokenConfigured && !clearCustomToken
              ? 'Your custom bot token is saved. Leaving this field blank keeps it intact. To switch to the default Taskera bot, click "Remove custom token".'
              : (
                <>
                  If you don't enter a token, Taskera's default bot will be used. Make sure to first open{' '}
                  <a
                    href="https://t.me/Taskeraaa_Bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    @Taskeraaa_Bot
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  and press <span className="font-semibold text-slate-800 dark:text-slate-200">Start</span> once.
                </>
              )}
          </>
        )}
      </div>
    </div>
  );
};

