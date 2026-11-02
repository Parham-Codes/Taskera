import React from 'react';
import { Sparkles, ExternalLink } from 'lucide-react';

export const TelegramGuideSection = ({ lang, t }) => {
  return (
    <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 text-xs space-y-2 text-slate-700 dark:text-slate-300 transition-all">
      <p className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        <span>{t('telegramSetupGuideTitle')}</span>
      </p>
      <div className="space-y-1.5 text-[11px] leading-relaxed">
        <p>
          {lang === 'fa' ? (
            <>
              ۱. به ربات{' '}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                @userinfobot
                <ExternalLink className="w-2.5 h-2.5" />
              </a>{' '}
              در تلگرام پیام <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[10px]">/start</code> بفرستید تا Chat ID عددی خود را بگیرید.
            </>
          ) : (
            <>
              1. Send <code className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-[10px]">/start</code> to{' '}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                @userinfobot
                <ExternalLink className="w-2.5 h-2.5" />
              </a>{' '}
              in Telegram to obtain your numeric Chat ID.
            </>
          )}
        </p>
        <p>
          {lang === 'fa' ? (
            <>
              ۲. اگر توکن وارد نمی‌کنید، به ربات پیش‌فرض{' '}
              <a
                href="https://t.me/Taskeraaa_Bot"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                @Taskeraaa_Bot
                <ExternalLink className="w-2.5 h-2.5" />
              </a>{' '}
              رفته و یک‌بار دکمه <span className="font-semibold text-slate-800 dark:text-slate-200">Start</span> را بزنید تا اجازه ارسال پیام به شما را داشته باشد.
            </>
          ) : (
            <>
              2. If not entering a custom token, open the default bot{' '}
              <a
                href="https://t.me/Taskeraaa_Bot"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                @Taskeraaa_Bot
                <ExternalLink className="w-2.5 h-2.5" />
              </a>{' '}
              and press <span className="font-semibold text-slate-800 dark:text-slate-200">Start</span> so it has permission to message you.
            </>
          )}
        </p>
        <p>{t('telegramStep3')}</p>
      </div>
    </div>
  );
};

