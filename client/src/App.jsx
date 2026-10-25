import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider, useLanguage } from './context/LanguageContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext.jsx';
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
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edf1f7] dark:bg-[#0B0F17]">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edf1f7] dark:bg-[#0B0F17]">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) {
    const destination = location.state?.from
      ? `${location.state.from.pathname}${location.state.from.search || ''}`
      : '/personal';
    return <Navigate to={destination} replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#edf1f7] dark:bg-[#0B0F17]">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return <Navigate to={user ? '/personal' : '/login'} replace />;
};

const MainApp = () => {
  const { isUnauthorizedWorkspace, loadingWorkspaces } = useWorkspace();
  const { lang } = useLanguage();
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
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-amber-500/30 text-center space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {lang === 'fa' ? 'سازمان یافت نشد یا دسترسی ندارید' : 'Workspace Not Found or Access Denied'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'fa'
                      ? 'شما عضو این فضای کاری نیستید یا این سازمان حذف شده است.'
                      : 'You are not a member of this workspace or it does not exist.'}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/personal')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all shadow-md shadow-brand-500/25 active:scale-95"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{lang === 'fa' ? 'بازگشت به فضای شخصی' : 'Go to Personal Space'}</span>
                </button>
              </div>
            </div>
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
        onOpenCreateOrg={() => setCreateOrgOpen(true)}
        onOpenInviteMember={() => setInviteMemberOpen(true)}
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
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter basename="/Taskera">
              <WorkspaceProvider>
                <CategoryProvider>
                  <NotificationProvider>
                    <ErrorBoundary>
                      <Routes>
                        <Route
                          path="/login"
                          element={
                            <PublicOnlyRoute>
                              <AuthScreen />
                            </PublicOnlyRoute>
                          }
                        />
                        <Route
                          path="/register"
                          element={
                            <PublicOnlyRoute>
                              <AuthScreen />
                            </PublicOnlyRoute>
                          }
                        />
                        <Route
                          path="/personal"
                          element={
                            <ProtectedRoute>
                              <MainApp />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/teams/:organizationId"
                          element={
                            <ProtectedRoute>
                              <MainApp />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="/" element={<RootRedirect />} />
                        <Route path="*" element={<RootRedirect />} />
                      </Routes>
                    </ErrorBoundary>
                  </NotificationProvider>
                </CategoryProvider>
              </WorkspaceProvider>
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
