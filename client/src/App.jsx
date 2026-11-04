import React, { useState, useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext.jsx';
import { CategoryProvider } from './context/CategoryContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { Sidebar } from './layouts/Sidebar.jsx';
import { TopHeader } from './layouts/TopHeader.jsx';
import { Footer } from './layouts/Footer.jsx';
import { TaskBoard } from './features/tasks/TaskBoard.jsx';
import { WorkspaceAccessDenied } from './features/workspaces/WorkspaceAccessDenied.jsx';
import { AppModals } from './components/modals/index.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import { AppRoutes } from './routes/AppRoutes.jsx';

const MainApp = () => {
  const { isUnauthorizedWorkspace, loadingWorkspaces } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  const isTeamRoute = location.pathname.startsWith('/teams/');

  // Layout & Navigation State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState('kanban');
  const [taskCounts, setTaskCounts] = useState({});
  const [allTasks, setAllTasks] = useState([]);
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState(null);

  // Modals State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState('import');
  const [telegramSettingsOpen, setTelegramSettingsOpen] = useState(false);
  const [removalRequestsModalOpen, setRemovalRequestsModalOpen] = useState(false);
  const [targetRemovalRequestId, setTargetRemovalRequestId] = useState(null);
  const [tasksRefreshTrigger, setTasksRefreshTrigger] = useState(0);
  const [lastImportedTasks, setLastImportedTasks] = useState(null);

  const handleOpenImportExport = (tab = 'import') => {
    setImportExportTab(tab);
    setImportExportModalOpen(true);
  };

  // Auto-open MemberRemovalRequestsModal if query param memberRemovalRequest is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reqId = params.get('memberRemovalRequest');
    if (reqId && isTeamRoute) {
      setTargetRemovalRequestId(reqId);
      setRemovalRequestsModalOpen(true);
    }
  }, [location.search, isTeamRoute]);

  const handleCloseRemovalRequests = () => {
    setRemovalRequestsModalOpen(false);
    setTargetRemovalRequestId(null);
    const params = new URLSearchParams(location.search);
    if (params.has('memberRemovalRequest')) {
      params.delete('memberRemovalRequest');
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
    }
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

  return (
    <div className="min-h-screen bg-[#edf1f7] dark:bg-[#0B0F17] transition-colors duration-200 flex">
      {/* 1. Sidebar */}
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
        onOpenRemovalRequests={() => setRemovalRequestsModalOpen(true)}
        taskCounts={taskCounts}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col lg:ms-72 min-w-0 transition-all">
        {/* Sticky Top Header */}
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

        {/* Dynamic Board Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {isTeamRoute && loadingWorkspaces ? (
            <div className="space-y-6">
              <div className="h-20 rounded-2xl glass-panel animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-64 rounded-3xl glass-panel animate-pulse" />
                ))}
              </div>
            </div>
          ) : isTeamRoute && !loadingWorkspaces && isUnauthorizedWorkspace ? (
            <WorkspaceAccessDenied />
          ) : (
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
          )}
        </main>

        <Footer />
      </div>

      {/* 3. Global Modals Container */}
      <AppModals
        createOrgOpen={createOrgOpen}
        onCloseCreateOrg={() => setCreateOrgOpen(false)}
        inviteMemberOpen={inviteMemberOpen}
        onCloseInviteMember={() => setInviteMemberOpen(false)}
        categoryManagerOpen={categoryManagerOpen}
        onCloseCategoryManager={() => setCategoryManagerOpen(false)}
        commandPaletteOpen={commandPaletteOpen}
        onCloseCommandPalette={() => setCommandPaletteOpen(false)}
        importExportModalOpen={importExportModalOpen}
        onCloseImportExport={() => setImportExportModalOpen(false)}
        importExportTab={importExportTab}
        onTasksImported={(importedTasks) => {
          setAllTasks((prev) => [...importedTasks, ...prev]);
          setLastImportedTasks(importedTasks);
          setTasksRefreshTrigger((prev) => prev + 1);
        }}
        telegramSettingsOpen={telegramSettingsOpen}
        onCloseTelegramSettings={() => setTelegramSettingsOpen(false)}
        removalRequestsModalOpen={removalRequestsModalOpen}
        onCloseRemovalRequests={handleCloseRemovalRequests}
        targetRemovalRequestId={targetRemovalRequestId}
        allTasks={allTasks}
        onSelectTask={(taskId) => setSelectedDetailTaskId(taskId)}
        onOpenNewTask={() => setTaskModalOpen(true)}
        onOpenCategoryManager={() => setCategoryManagerOpen(true)}
        onOpenCreateOrg={() => setCreateOrgOpen(true)}
        onOpenInviteMember={() => setInviteMemberOpen(true)}
        onOpenImportExport={handleOpenImportExport}
        onFilterChange={(filterId) => setActiveFilter(filterId)}
        onViewModeChange={(mode) => setViewMode(mode)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter basename="/Taskera">
              <WorkspaceProvider>
                <SocketProvider>
                  <CategoryProvider>
                    <NotificationProvider>
                      <ErrorBoundary>
                        <AppRoutes MainApp={MainApp} />
                      </ErrorBoundary>
                    </NotificationProvider>
                  </CategoryProvider>
                </SocketProvider>
              </WorkspaceProvider>
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
