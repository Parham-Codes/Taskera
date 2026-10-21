import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, AlertCircle, ArrowRight, Sun, Moon, Languages } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export const AuthScreen = () => {
  const { login, register } = useAuth();
  const { theme, toggleTheme, animating } = useTheme();
  const { lang, toggleLang, t } = useLanguage();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          setError(t('fullNameLabel'));
          setLoading(false);
          return;
        }
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      // 1. Network Disconnect / Server is not running
      if (!err.response || err.code === 'ERR_NETWORK') {
        setError(t('serverConnectionError'));
        return;
      }

      // 2. Server Internal Error (500+)
      if (err.response.status >= 500) {
        setError(t('serverInternalError'));
        return;
      }

      // 3. Client & Credential Errors
      const rawMsg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        '';

      if (rawMsg.includes('Invalid email or password') || err.response.status === 401) {
        setError(t('invalidCredentials'));
      } else if (rawMsg.includes('already exists')) {
        setError(t('emailAlreadyExists'));
      } else if (rawMsg.includes('email') && (rawMsg.includes('format') || rawMsg.includes('valid'))) {
        setError(t('invalidEmailFormat'));
      } else if (rawMsg.includes('at least 6 characters')) {
        setError(t('passwordTooShort'));
      } else if (rawMsg.includes('Too many') || err.response?.status === 429) {
        setError(t('rateLimitError'));
      } else if (rawMsg) {
        setError(rawMsg);
      } else {
        setError(t('authFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-slate-50 dark:bg-[#0B0F17] transition-colors duration-300">
      {/* Ambient background blur */}
      <div className="absolute top-1/4 start-1/3 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 end-1/3 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Controls: Language & Theme Toggle */}
      <div className="absolute top-6 end-6 flex items-center gap-2 z-20">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl glass-panel text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-xs"
        >
          <Languages className="w-3.5 h-3.5 text-brand-500" />
          <span>{lang === 'fa' ? 'English' : 'فارسی'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-2xl glass-panel text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all shadow-xs ${
            animating ? 'animate-theme-toggle' : ''
          }`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>

      {/* Glassmorphic Auth Card */}
      <div className="w-full max-w-md glass-panel rounded-3xl p-8 shadow-glass-md border border-slate-200/90 dark:border-slate-800/90 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t('brandName')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isRegister ? t('authSubtitleRegister') : t('authSubtitleLogin')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 mb-6 rounded-2xl glass-panel border border-slate-200/70 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isRegister
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('signIn')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isRegister
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t('createAccount')}
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {t('fullNameLabel')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('fullNamePlaceholder')}
                  className="w-full ps-9 pe-3.5 py-2.5 rounded-2xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              {t('emailLabel')}
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                className="w-full ps-9 pe-3.5 py-2.5 rounded-2xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              {t('passwordLabel')}
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder')}
                className="w-full ps-9 pe-3.5 py-2.5 rounded-2xl text-xs sm:text-sm glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-2xl text-xs sm:text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 active:scale-[0.99] transition-all shadow-md shadow-brand-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{loading ? t('pleaseWait') : isRegister ? t('createAccount') : t('signIn')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
