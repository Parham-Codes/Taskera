import React, { useState } from 'react';
import { MessageSquare, Trash2, Send, Loader2, Bell, BellOff } from 'lucide-react';
import { formatTaskDate } from '../../utils/taskHelpers.js';

export const TaskDetailComments = ({
  comments = [],
  currentUserId,
  onDeleteComment,
  onSendComment,
  submittingComment,
  isMuted = false,
  canMute = false,
  onToggleMute,
  mutingLoading = false,
  lang,
  t,
}) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    const content = newComment.trim();
    setNewComment('');
    await onSendComment(content);
  };

  return (
    <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brand-500" />
          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
            {t('commentsTitle')} ({comments.length})
          </h4>
        </div>

        {canMute && (
          <button
            type="button"
            onClick={onToggleMute}
            disabled={mutingLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border ${
              isMuted
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={
              isMuted
                ? (lang === 'fa' ? 'اعلان‌های تلگرام برای شما بی‌صدا است. جهت فعال‌سازی کلیک کنید' : 'Notifications muted. Click to resume')
                : (lang === 'fa' ? 'جهت بی‌صدا کردن اعلان‌های این گفت‌وگو کلیک کنید' : 'Click to mute thread notifications')
            }
          >
            {mutingLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isMuted ? (
              <>
                <Bell className="w-3 h-3 text-amber-500" />
                <span>{lang === 'fa' ? 'فعال‌سازی اعلان‌ها' : 'Unmute'}</span>
              </>
            ) : (
              <>
                <BellOff className="w-3 h-3 text-slate-400" />
                <span>{lang === 'fa' ? 'بی‌صدا کردن این گفت‌وگو' : 'Mute Thread'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Comments List */}
      <div className="max-h-56 overflow-y-auto space-y-2.5 pe-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            {t('noComments')}
          </p>
        ) : (
          comments.map((c) => {
            const isMine = (c.author?._id || c.author) === currentUserId;
            return (
              <div
                key={c._id}
                className={`p-3 rounded-xl text-xs space-y-1.5 ${
                  isMine
                    ? 'glass-panel border-brand-500/30 ms-4'
                    : 'bg-slate-100/70 dark:bg-slate-800/40 me-4'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {c.author?.name || t('you')}
                  </span>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>{formatTaskDate(c.createdAt, lang)}</span>
                    {isMine && (
                      <button
                        onClick={() => onDeleteComment(c._id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                  {c.content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('writeCommentPlaceholder')}
          className="flex-1 px-3.5 py-2 text-xs rounded-xl glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submittingComment}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs"
        >
          {submittingComment ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
        </button>
      </form>
    </div>
  );
};
