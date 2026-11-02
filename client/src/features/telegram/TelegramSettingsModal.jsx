import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal.jsx';
import { TelegramIcon } from '../../components/ui/TelegramIcon.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { telegramApi } from '../../api/telegramApi.js';
import {
  TelegramStatusBanner,
  TelegramGuideSection,
  TelegramTokenInput,
  TelegramEventPreferences,
} from './components/index.js';

export const TelegramSettingsModal = ({ isOpen, onClose }) => {
  const { t, lang } = useLanguage();
  const { user, updateUser } = useAuth();

  const [enabled, setEnabled] = useState(false);
  const [chatId, setChatId] = useState('');
  const [botToken, setBotToken] = useState('');
  const [botTokenConfigured, setBotTokenConfigured] = useState(false);
  const [clearCustomToken, setClearCustomToken] = useState(false);
  const [notifyOnCreated, setNotifyOnCreated] = useState(true);
  const [notifyOnAssigned, setNotifyOnAssigned] = useState(true);
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true);
  const [notifyOnReminders, setNotifyOnReminders] = useState(true);

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStatusMessage(null);
      setBotToken('');
      setClearCustomToken(false);
      return;
    }

    let isSubscribed = true;
    setStatusMessage(null);
    setBotToken('');
    setClearCustomToken(false);

    const applySettings = (settings) => {
      if (!settings || !isSubscribed) return;
      setEnabled(Boolean(settings.enabled));
      setChatId(settings.chatId || '');
      setBotTokenConfigured(Boolean(settings.botTokenConfigured));
      setNotifyOnCreated(settings.notifyOnCreated !== false);
      setNotifyOnAssigned(settings.notifyOnAssigned !== false);
      setNotifyOnStatusChange(settings.notifyOnStatusChange !== false);
      setNotifyOnReminders(settings.notifyOnReminders !== false);
    };

    if (user?.telegramSettings) {
      applySettings(user.telegramSettings);
    }

    telegramApi
      .getSettings()
      .then((resSettings) => {
        if (resSettings && isSubscribed) {
          applySettings(resSettings);
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, user?.telegramSettings]);

  const handleSave = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const payload = {
        enabled,
        chatId: chatId.trim(),
        notifyOnCreated,
        notifyOnAssigned,
        notifyOnStatusChange,
        notifyOnReminders,
      };

      if (clearCustomToken) {
        payload.clearBotToken = true;
      } else if (botToken.trim().length > 0) {
        payload.botToken = botToken.trim();
      }

      const updatedSettings = await telegramApi.updateSettings(payload);

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
      setBotToken('');
      setClearCustomToken(false);
      setBotTokenConfigured(Boolean(updatedSettings?.botTokenConfigured));
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to save settings',
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
      const testPayload = {
        chatId: chatId.trim(),
      };
      if (botToken.trim().length > 0) {
        testPayload.botToken = botToken.trim();
      }

      await telegramApi.testNotification(testPayload);

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
        {/* Status Summary Banner */}
        <TelegramStatusBanner
          enabled={enabled}
          setEnabled={setEnabled}
          t={t}
        />

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
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
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
          {showGuide && <TelegramGuideSection lang={lang} t={t} />}

          {/* Optional Bot Token Field */}
          <TelegramTokenInput
            botToken={botToken}
            setBotToken={setBotToken}
            botTokenConfigured={botTokenConfigured}
            clearCustomToken={clearCustomToken}
            setClearCustomToken={setClearCustomToken}
            lang={lang}
            t={t}
          />

          {/* Event Checkboxes */}
          <TelegramEventPreferences
            notifyOnCreated={notifyOnCreated}
            setNotifyOnCreated={setNotifyOnCreated}
            notifyOnAssigned={notifyOnAssigned}
            setNotifyOnAssigned={setNotifyOnAssigned}
            notifyOnStatusChange={notifyOnStatusChange}
            setNotifyOnStatusChange={setNotifyOnStatusChange}
            notifyOnReminders={notifyOnReminders}
            setNotifyOnReminders={setNotifyOnReminders}
            t={t}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          {/* Test Dispatch Button */}
          <button
            type="button"
            disabled={testing || !chatId.trim()}
            onClick={handleTestNotification}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40 cursor-pointer"
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-600/25 disabled:opacity-50 cursor-pointer"
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
