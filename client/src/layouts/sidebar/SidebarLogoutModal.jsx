import React, { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { Modal } from '../../components/ui/index.js';

export const SidebarLogoutModal = ({
  isOpen,
  onClose,
  onLogout,
  t,
}) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConfirm = async () => {
    setLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setLoggingOut(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loggingOut && onClose()}
      title={t('confirmLogoutTitle')}
      icon={LogOut}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-1">
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {t('confirmLogoutDesc')}
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            disabled={loggingOut}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={loggingOut}
            onClick={handleConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all shadow-md shadow-red-600/25 disabled:opacity-50 cursor-pointer"
          >
            {loggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('loggingOut')}</span>
              </>
            ) : (
              <span>{t('confirmLogoutBtn')}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

