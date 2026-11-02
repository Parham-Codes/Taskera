import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export const WorkspaceAccessDenied = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-amber-500/30 text-center space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {lang === 'fa' ? 'سازمان یافت نشد یا دسترسی ندارید' : 'Workspace Not Found or Access Denied'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {lang === 'fa'
              ? 'شما عضو این فضای کاری نیستید یا این سازمان حذف شده است.'
              : 'You are not a member of this workspace or it does not exist.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/personal')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all shadow-md shadow-brand-500/25 active:scale-95 cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>{lang === 'fa' ? 'بازگشت به فضای شخصی' : 'Go to Personal Space'}</span>
        </button>
      </div>
    </div>
  );
};

