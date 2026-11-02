import React from 'react';
import { CreateOrgModal } from '../../features/workspaces/CreateOrgModal.jsx';
import { InviteMemberModal } from '../../features/workspaces/InviteMemberModal.jsx';
import { CategoryManagerModal } from '../../features/categories/CategoryManagerModal.jsx';
import { CommandPalette } from '../CommandPalette/CommandPalette.jsx';
import { TaskImportExportModal } from '../../features/tasks/TaskImportExportModal.jsx';
import { TelegramSettingsModal } from '../../features/telegram/TelegramSettingsModal.jsx';
import { MemberRemovalRequestsModal } from '../../features/workspaces/MemberRemovalRequestsModal.jsx';

export const AppModals = ({
  createOrgOpen,
  onCloseCreateOrg,
  inviteMemberOpen,
  onCloseInviteMember,
  categoryManagerOpen,
  onCloseCategoryManager,
  commandPaletteOpen,
  onCloseCommandPalette,
  importExportModalOpen,
  onCloseImportExport,
  importExportTab,
  onTasksImported,
  telegramSettingsOpen,
  onCloseTelegramSettings,
  removalRequestsModalOpen,
  onCloseRemovalRequests,
  targetRemovalRequestId,
  allTasks = [],
  onSelectTask,
  onOpenNewTask,
  onOpenCategoryManager,
  onOpenCreateOrg,
  onOpenInviteMember,
  onOpenImportExport,
  onFilterChange,
  onViewModeChange,
}) => {
  return (
    <>
      <CreateOrgModal
        isOpen={createOrgOpen}
        onClose={onCloseCreateOrg}
      />

      <InviteMemberModal
        isOpen={inviteMemberOpen}
        onClose={onCloseInviteMember}
      />

      <CategoryManagerModal
        isOpen={categoryManagerOpen}
        onClose={onCloseCategoryManager}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={onCloseCommandPalette}
        tasks={allTasks}
        onSelectTask={onSelectTask}
        onOpenNewTask={onOpenNewTask}
        onOpenCategoryManager={onOpenCategoryManager}
        onOpenCreateOrg={onOpenCreateOrg}
        onOpenInviteMember={onOpenInviteMember}
        onOpenImportExport={onOpenImportExport}
        onFilterChange={onFilterChange}
        onViewModeChange={onViewModeChange}
      />

      <TaskImportExportModal
        isOpen={importExportModalOpen}
        onClose={onCloseImportExport}
        tasks={allTasks}
        initialTab={importExportTab}
        onTasksImported={onTasksImported}
      />

      <TelegramSettingsModal
        isOpen={telegramSettingsOpen}
        onClose={onCloseTelegramSettings}
      />

      <MemberRemovalRequestsModal
        isOpen={removalRequestsModalOpen}
        onClose={onCloseRemovalRequests}
        targetRequestId={targetRemovalRequestId}
      />
    </>
  );
};

