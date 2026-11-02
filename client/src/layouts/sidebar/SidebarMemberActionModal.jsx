import React, { useState } from 'react';
import { Trash2, UserMinus } from 'lucide-react';
import { ConfirmModal } from '../../components/ui/index.js';

export const SidebarMemberActionModal = ({
  actionData,
  onClose,
  onRemoveDirect,
  onRequestRemoval,
  t,
}) => {
  const [loading, setLoading] = useState(false);

  if (!actionData) return null;

  const isDirectDelete = actionData.type === 'direct_delete';

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (isDirectDelete) {
        await onRemoveDirect(actionData.memberId);
      } else {
        await onRequestRemoval(actionData.memberId);
      }
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmModal
      isOpen={Boolean(actionData)}
      onClose={onClose}
      title={isDirectDelete ? t('removeMember') : t('requestMemberRemoval')}
      description={
        isDirectDelete
          ? `${t('confirmRemoveMemberDirect')} (${actionData.memberName})`
          : `${t('confirmRequestMemberRemoval')} (${actionData.memberName})`
      }
      confirmText={isDirectDelete ? t('removeMember') : t('requestMemberRemoval')}
      cancelText={t('cancel')}
      variant={isDirectDelete ? 'danger' : 'warning'}
      icon={isDirectDelete ? Trash2 : UserMinus}
      loading={loading}
      onConfirm={handleConfirm}
    />
  );
};

