import React, { useMemo } from 'react';
import { Eye, Copy, UserMinus, UserX } from 'lucide-react';
import { ContextMenu } from '../../components/contextMenu/index.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

export const SidebarMemberContextMenu = ({
  position,
  isOpen,
  x,
  y,
  onClose,
  member,
  canViewTasks = false,
  onViewTasks,
  onCopyEmail,
  onRemoveMember,
  canRemoveDirect = false,
  canRequestRemoval = false,
}) => {
  const { t, lang } = useLanguage();

  const items = useMemo(() => {
    if (!member) return [];

    const memberItems = [];

    if (canViewTasks) {
      memberItems.push({
        id: 'view-member-tasks',
        label: t('viewMemberTasks') || (lang === 'fa' ? 'مشاهده تسک‌های این عضو' : 'View Member Tasks'),
        icon: Eye,
        onClick: () => onViewTasks?.(member),
      });
    }

    if (member.email) {
      memberItems.push({
        id: 'copy-member-email',
        label: t('copyEmail') || (lang === 'fa' ? 'کپی ایمیل کاربر' : 'Copy Email'),
        icon: Copy,
        onClick: () => onCopyEmail?.(member.email),
      });
    }

    if (canRemoveDirect) {
      memberItems.push(
        { type: 'separator' },
        {
          id: 'remove-member-direct',
          label: t('removeMember') || (lang === 'fa' ? 'حذف عضو از سازمان' : 'Remove Member'),
          icon: UserMinus,
          danger: true,
          onClick: () => onRemoveMember?.(member, 'direct'),
        }
      );
    } else if (canRequestRemoval) {
      memberItems.push(
        { type: 'separator' },
        {
          id: 'request-member-removal',
          label: t('requestMemberRemoval') || (lang === 'fa' ? 'درخواست حذف عضو' : 'Request Member Removal'),
          icon: UserX,
          danger: true,
          onClick: () => onRemoveMember?.(member, 'request'),
        }
      );
    }

    return memberItems;
  }, [
    member,
    canViewTasks,
    canRemoveDirect,
    canRequestRemoval,
    onViewTasks,
    onCopyEmail,
    onRemoveMember,
    lang,
    t,
  ]);

  const finalX = position ? position.x : x;
  const finalY = position ? position.y : y;

  return (
    <ContextMenu
      isOpen={isOpen !== undefined ? isOpen : Boolean(position)}
      x={finalX}
      y={finalY}
      onClose={onClose}
      items={items}
      title={member?.name || member?.email}
      minWidth={210}
    />
  );
};
