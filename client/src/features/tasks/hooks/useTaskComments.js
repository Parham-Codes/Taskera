import { useState } from 'react';
import { api } from '../../../api/client.js';

export const useTaskComments = ({ task, setError }) => {
  const [comments, setComments] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [canMute, setCanMute] = useState(false);
  const [mutingLoading, setMutingLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const setInitialCommentsData = ({ comments: initComments = [], isMuted: initMuted = false, canMute: initCanMute = false }) => {
    setComments(initComments);
    setIsMuted(initMuted);
    setCanMute(initCanMute);
  };

  const handleToggleMute = async () => {
    if (!task?._id || mutingLoading) return;
    setMutingLoading(true);
    try {
      const res = await api.post(`/tasks/${task._id}/comments/toggle-mute`);
      if (res.data?.success) {
        setIsMuted(res.data.data.isMuted);
      }
    } catch (err) {
      setError?.(err.response?.data?.message || 'Failed to update notification preference');
    } finally {
      setMutingLoading(false);
    }
  };

  const handleSendComment = async (content) => {
    if (!task || !content) return;
    setSubmittingComment(true);
    try {
      const res = await api.post(`/tasks/${task._id}/comments`, { content });
      if (res.data?.success) {
        setComments((prev) => [...prev, res.data.data.comment]);
        setIsMuted(false);
      }
    } catch (err) {
      setError?.(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleRequestDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
  };

  const handleConfirmDeleteComment = async () => {
    if (!task || !commentToDelete) return;
    try {
      setDeletingCommentId(commentToDelete);
      await api.delete(`/tasks/${task._id}/comments/${commentToDelete}`);
      setComments((prev) => prev.filter((c) => c._id !== commentToDelete));
      setCommentToDelete(null);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  return {
    comments,
    isMuted,
    canMute,
    mutingLoading,
    submittingComment,
    commentToDelete,
    deletingCommentId,
    setCommentToDelete,
    setInitialCommentsData,
    handleToggleMute,
    handleSendComment,
    handleRequestDeleteComment,
    handleConfirmDeleteComment,
  };
};

