import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { WorkspaceProvider } from './context/WorkspaceContext.jsx';
import { CategoryProvider } from './context/CategoryContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { Sidebar } from './layouts/Sidebar.jsx';
import { TopHeader } from './layouts/TopHeader.jsx';
import { TaskBoard } from './features/tasks/TaskBoard.jsx';
import { AuthScreen } from './features/auth/AuthScreen.jsx';
import { CreateOrgModal } from './features/workspaces/CreateOrgModal.jsx';
import { InviteMemberModal } from './features/workspaces/InviteMemberModal.jsx';
import { CategoryManagerModal } from './features/categories/CategoryManagerModal.jsx';
import { CommandPalette } from './components/CommandPalette/CommandPalette.jsx';
import { TaskImportExportModal } from './features/tasks/TaskImportExportModal.jsx';
import { TelegramSettingsModal } from './features/telegram/TelegramSettingsModal.jsx';
import { Footer } from './layouts/Footer.jsx';

const MainApp = () => {
  const { user, loading } = useAuth();

  // Layout & Navigation State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('kanban');
  const [taskCounts, setTaskCounts] = useState({});
  const [allTasks, setAllTasks] = useState([]);
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState(null);

  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState('import');
  const [telegramSettingsOpen, setTelegramSettingsOpen] = useState(false);
  const [tasksRefreshTrigger, setTasksRefreshTrigger] = useState(0);
  const [lastImportedTasks, setLastImportedTasks] = useState(null);

  const handleOpenImportExport = (tab = 'import') => {
    setImportExportTab(tab);
    setImportExportModalOpen(true);
  };

  // Global Shortcut for Command Palette: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edf1f7] dark:bg-[#0B0F17]">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#edf1f7] dark:bg-[#0B0F17] transition-colors duration-200 flex">
      {/* 1. Collapsible & Responsive Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onOpenNewTask={() => setTaskModalOpen(true)}
        onOpenCreateOrg={() => setCreateOrgOpen(true)}
        onOpenInviteMember={() => setInviteMemberOpen(true)}
        onOpenCategoryManager={() => setCategoryManagerOpen(true)}
        onOpenTelegramSettings={() => setTelegramSettingsOpen(true)}
        taskCounts={taskCounts}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col lg:ms-72 min-w-0 transition-all">
        {/* Sticky Top Header with Search & Quick View Controls */}
        <TopHeader
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          search={search}
          onSearchChange={setSearch}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenNewTask={() => setTaskModalOpen(true)}
          onOpenTaskDetail={(taskId) => setSelectedDetailTaskId(taskId)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenCategoryManager={() => setCategoryManagerOpen(true)}
          onOpenImportExport={handleOpenImportExport}
          onOpenTelegramSettings={() => setTelegramSettingsOpen(true)}
        />

        {/* Dynamic Task Board Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <TaskBoard
            search={search}
            priorityFilter={priorityFilter}
            viewMode={viewMode}
            sidebarFilter={activeFilter}
            taskModalOpen={taskModalOpen}
            onCloseTaskModal={() => setTaskModalOpen(false)}
            onOpenTaskModal={() => setTaskModalOpen(true)}
            onTaskCountsUpdate={setTaskCounts}
            onTasksUpdate={setAllTasks}
            onOpenCategoryManager={() => setCategoryManagerOpen(true)}
            onResetSidebarFilter={setActiveFilter}
            externalDetailTaskId={selectedDetailTaskId}
            onClearExternalDetailTaskId={() => setSelectedDetailTaskId(null)}
            refreshTrigger={tasksRefreshTrigger}
            newImportedTasks={lastImportedTasks}
          />
        </main>

        {/* Minimal Clean Footer */}
        <Footer />
      </div>

      {/* Modals */}
      <CreateOrgModal
        isOpen={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
      />

      <InviteMemberModal
        isOpen={inviteMemberOpen}
        onClose={() => setInviteMemberOpen(false)}
      />

      <CategoryManagerModal
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        tasks={allTasks}
        onSelectTask={(taskId) => setSelectedDetailTaskId(taskId)}
        onOpenNewTask={() => setTaskModalOpen(true)}
        onOpenCategoryManager={() => setCategoryManagerOpen(true)}
        onOpenImportExport={handleOpenImportExport}
        onFilterChange={(filterId) => setActiveFilter(filterId)}
        onViewModeChange={(mode) => setViewMode(mode)}
      />

      <TaskImportExportModal
        isOpen={importExportModalOpen}
        onClose={() => setImportExportModalOpen(false)}
        tasks={allTasks}
        initialTab={importExportTab}
        onTasksImported={(importedTasks) => {
          setAllTasks((prev) => [...importedTasks, ...prev]);
          setLastImportedTasks(importedTasks);
          setTasksRefreshTrigger((prev) => prev + 1);
        }}
      />

      <TelegramSettingsModal
        isOpen={telegramSettingsOpen}
        onClose={() => setTelegramSettingsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <CategoryProvider>
              <NotificationProvider>
                <MainApp />
              </NotificationProvider>
            </CategoryProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
