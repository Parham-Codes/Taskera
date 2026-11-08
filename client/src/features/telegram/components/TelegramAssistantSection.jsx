import React from 'react';
import { Mic, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';

export const TelegramAssistantSection = ({
  assistantEnabled,
  setAssistantEnabled,
  chatId,
  t,
  lang,
}) => {
  const hasChatId = Boolean(chatId && String(chatId).trim().length > 0);

  const handleToggle = (checked) => {
    if (checked && !hasChatId) {
      return;
    }
    setAssistantEnabled(checked);
  };

  return (
    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-brand-500" />
          <span>{t('telegramVoiceAssistantTitle') || (lang === 'fa' ? 'دستیار صوتی تلگرام' : 'Telegram Voice Assistant')}</span>
        </label>

        {/* Pill status badge */}
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            assistantEnabled && hasChatId
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
              : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          {assistantEnabled && hasChatId ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              <span>{t('active') || (lang === 'fa' ? 'فعال' : 'Active')}</span>
            </>
          ) : (
            <span>{t('inactive') || (lang === 'fa' ? 'غیرفعال' : 'Inactive')}</span>
          )}
        </span>
      </div>

      <div className="p-3 rounded-2xl glass-panel border border-slate-200/70 dark:border-slate-800 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>
                {t('enableVoiceAssistant') || (lang === 'fa' ? 'فعال‌سازی هوش مصنوعی و ساخت تسک با ویس' : 'Enable AI Voice-to-Task')}
              </span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('voiceAssistantDesc') ||
                (lang === 'fa'
                  ? 'با ارسال ویس یا پیام متنی به بات اختصاصی تلگرام، تسک‌ها به‌صورت خودکار در فضای کاری شخصی شما ایجاد می‌شوند.'
                  : 'Send voice notes or text messages to your dedicated bot to create tasks automatically in your personal workspace.')}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={assistantEnabled && hasChatId}
              disabled={!hasChatId}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${hasChatId ? 'peer-checked:bg-brand-500 cursor-pointer' : 'opacity-40 cursor-not-allowed'}`} />
          </label>
        </div>

        {/* Notice if Chat ID is missing */}
        {!hasChatId && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-relaxed">
              {t('assistantRequiresChatId') ||
                (lang === 'fa'
                  ? 'برای فعال‌سازی دستیار صوتی، ابتدا شناسه چت (Chat ID) خود را در کادر بالا وارد و ذخیره کنید.'
                  : 'To enable the voice assistant, please enter and save your Telegram Chat ID in the field above first.')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

