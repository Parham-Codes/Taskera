import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Modal } from './Modal.jsx';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'danger',
  icon: IconComponent = Trash2,
  loading: externalLoading,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  const handleConfirm = async () => {
    if (isLoading) return;
    try {
      setInternalLoading(true);
      await onConfirm?.();
    } finally {
      setInternalLoading(false);
    }
  };

  const confirmBtnClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
      : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/25';

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isLoading && onClose?.()}
      title={title}
      icon={IconComponent}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-1">
        {description && (
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200/60 dark:border-slate-800">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {cancelText || 'انصراف'}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white active:scale-[0.98] transition-all shadow-md disabled:opacity-50 ${confirmBtnClasses}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال پردازش...</span>
              </>
            ) : (
              <span>{confirmText || 'تأیید'}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
