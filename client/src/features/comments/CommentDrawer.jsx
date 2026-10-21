import React, { useState, useEffect } from 'react';
import { X, Send, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useScrollLock } from '../../utils/useScrollLock.js';

import { createPortal } from 'react-dom';

export const CommentDrawer = ({ isOpen, onClose, task }) => {
  useScrollLock(isOpen);

  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && task?._id) {
      fetchComments();
    } else {
      setComments([]);
      setNewComment('');
      setError('');
    }
  }, [isOpen, task]);

  const fetchComments = async () => {
    if (!task?._id) return;
    setLoading(true);
    try {
      const res = await api.get(`/tasks/${task._id}/comments`);
      if (res.data?.success) {
        setComments(res.data.data.comments || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post(`/tasks/${task._id}/comments`, {
        content: newComment.trim(),
      });
      if (res.data?.success && res.data.data.comment) {
        setComments((prev) => [...prev, res.data.data.comment]);
        setNewComment('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/tasks/${task._id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen || !task) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden overscroll-contain" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-200 animate-in fade-in cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className={`fixed inset-y-0 ${
          lang === 'fa'
            ? 'left-0 border-r animate-in slide-in-from-left'
            : 'right-0 border-l animate-in slide-in-from-right'
        } z-[101] w-full max-w-md h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden duration-250`}
        style={{ top: 0, bottom: 0, height: '100dvh', maxHeight: '100vh' }}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {task.title}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">{t('commentsDesc')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 ms-2"
            title={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Comment Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-xs text-slate-400">
              {t('loadingComments')}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
              <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs font-semibold">{t('noComments')}</p>
              <p className="text-[11px] opacity-75">{t('startDiscussion')}</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isMe = comment.authorId?._id === user?.id;

              return (
                <div key={comment._id} className="group flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5">
                    {comment.authorId?.name ? comment.authorId.name[0].toUpperCase() : 'U'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">
                        {comment.authorId?.name} {isMe && <span className="opacity-60 font-normal">({t('you')})</span>}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-slate-400">{formatDate(comment.createdAt)}</span>
                        {isMe && (
                          <button
                            onClick={() => handleDeleteComment(comment._id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-opacity"
                            title={t('delete')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 p-3 rounded-2xl glass-panel text-xs leading-relaxed break-words border border-slate-200/80 dark:border-slate-800">
                      {comment.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleAddComment}
          className="p-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50"
        >
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="p-2.5 rounded-2xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 transition-all shadow-sm shrink-0 active:scale-95"
            title={t('send')}
          >
            <Send className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('writeCommentPlaceholder')}
            className="flex-1 px-3.5 py-2.5 rounded-2xl text-xs glass-input focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
          />
        </form>
      </aside>
    </div>,
    document.body
  );
};
