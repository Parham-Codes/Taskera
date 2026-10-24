import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Bot,
  Key,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { TelegramIcon } from '../../components/ui/TelegramIcon.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { telegramApi } from '../../api/telegramApi.js';

export const TelegramSettingsModal = ({ isOpen, onClose }) => {
  const { t, lang } = useLanguage();
  const { user, updateUser } = useAuth();

  const [enabled, setEnabled] = useState(false);
  const [chatId, setChatId] = useState('');
  const [botToken, setBotToken] = useState('');
  const [notifyOnCreated, setNotifyOnCreated] = useState(true);
  const [notifyOnAssigned, setNotifyOnAssigned] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [notifyOnReminders, setNotifyOnReminders] = useState(true);

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [showGuide, setShowGuide] = useState(false);

  // Load user settings on modal open
  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      const settings = user?.telegramSettings;
      if (settings) {
        setEnabled(Boolean(settings.enabled));
        setChatId(settings.chatId || '');
        setBotToken(settings.botToken || '');
        setNotifyOnCreated(settings.notifyOnCreated !== false);
        setNotifyOnAssigned(settings.notifyOnAssigned !== false);
        setNotifyOnStatusChange(settings.notifyOnStatusChange !== false);
        setNotifyOnReminders(settings.notifyOnReminders !== false);
      } else {
        // Fetch from backend
        telegramApi
          .getSettings()
          .then((resSettings) => {
            if (resSettings) {
              setEnabled(Boolean(resSettings.enabled));
              setChatId(resSettings.chatId || '');
              setBotToken(resSettings.botToken || '');
              setNotifyOnCreated(resSettings.notifyOnCreated !== false);
              setNotifyOnAssigned(resSettings.notifyOnAssigned !== false);
              setNotifyOnStatusChange(resSettings.notifyOnStatusChange !== false);
              setNotifyOnReminders(resSettings.notifyOnReminders !== false);
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, user]);

  const handleSave = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const payload = {
        enabled,
        chatId: chatId.trim(),
        botToken: botToken.trim(),
        notifyOnCreated,
        notifyOnAssigned,
        notifyOnStatusChange,
        notifyOnReminders,
      };

      const updatedSettings = await telegramApi.updateSettings(payload);

      // Update auth context so other components immediately know the new state
      if (updateUser) {
        updateUser({
          ...user,
          telegramSettings: updatedSettings,
        });
      }

      setStatusMessage({
        type: 'success',
        text: t('telegramSaveSuccess'),
      });

      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Error saving settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!chatId.trim()) {
      setStatusMessage({
        type: 'error',
        text: t('telegramChatIdPlaceholder') + ' ' + (lang === 'fa' ? 'را وارد کنید' : 'is required'),
      });
      return;
    }

    setTesting(true);
    setStatusMessage(null);

    try {
      await telegramApi.testNotification({
        botToken: botToken.trim() || undefined,
        chatId: chatId.trim(),
      });

      setStatusMessage({
        type: 'success',
        text: t('telegramTestSuccess'),
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Telegram connection failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('telegramSettingsTitle')}
      icon={TelegramIcon}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSave} className="space-y-5 pt-2">
        {/* Header Banner / Status Summary */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-500/5 via-transparent to-brand-500/5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                enabled
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {t('telegramStatus')}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {enabled ? t('telegramEnabled') : t('telegramDisabled')}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-all ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Chat ID Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>{t('telegramChatIdLabel')}</span>
                <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{lang === 'fa' ? 'چطور دریافت کنم؟' : 'How to get ID?'}</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder={t('telegramChatIdPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              {t('telegramChatIdHelp')}
            </p>
          </div>

          {/* Quick Setup Guide Collapse */}
          {showGuide && (
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
          )}

          {/* Optional Bot Token Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('telegramBotTokenLabel')}
            </label>
            <div className="relative">
              <input
                type="password"
                dir="ltr"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={t('telegramBotTokenPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors font-mono"
              />
            </div>
            <div className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60">
              {lang === 'fa' ? (
                <>
                  <span className="font-bold text-slate-700 dark:text-slate-300">راهنما:</span> اگر توکن وارد نکنید، از ربات پیش‌فرض تسکرا استفاده می‌شود. کافیست ابتدا به آیدی{' '}
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
              ) : (
                <>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Help:</span> If you don't enter a token, Taskera's default bot will be used. Make sure to first open{' '}
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
            </div>
          </div>

          {/* Event Checkboxes */}
          <div className="pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('telegramPreferences')}</span>
            </label>

            <div className="space-y-2 p-3 rounded-xl glass-panel border border-slate-200/60 dark:border-slate-800 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnCreated}
                  onChange={(e) => setNotifyOnCreated(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 focus:outline-none"
                />
                <span className="text-slate-700 dark:text-slate-300 text-xs">
                  {t('notifyOnCreated')}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnAssigned}
                  onChange={(e) => setNotifyOnAssigned(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 focus:outline-none"
                />
                <span className="text-slate-700 dark:text-slate-300 text-xs">
                  {t('notifyOnAssigned')}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnStatusChange}
                  onChange={(e) => setNotifyOnStatusChange(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 focus:outline-none"
                />
                <span className="text-slate-700 dark:text-slate-300 text-xs">
                  {t('notifyOnStatusChange')}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnReminders}
                  onChange={(e) => setNotifyOnReminders(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 focus:outline-none"
                />
                <span className="text-slate-700 dark:text-slate-300 text-xs">
                  {t('notifyOnReminders')}
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          {/* Test Dispatch Button */}
          <button
            type="button"
            disabled={testing || !chatId.trim()}
            onClick={handleTestNotification}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t('telegramTesting')}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{t('telegramTestBtn')}</span>
              </>
            )}
          </button>

          {/* Cancel & Save Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-600/25 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('pleaseWait')}</span>
                </>
              ) : (
                <span>{t('save')}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
