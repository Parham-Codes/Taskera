import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ServerWakeupScreen } from '../components/common/ServerWakeupScreen.jsx';
import { AuthScreen } from '../features/auth/AuthScreen.jsx';

export const GlobalAppLoader = () => {
  const { serverStatus, elapsedSeconds, retryAuth } = useAuth();
  return (
    <ServerWakeupScreen
      status={serverStatus}
      elapsedSeconds={elapsedSeconds}
      onRetry={retryAuth}
    />
  );
};

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GlobalAppLoader />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GlobalAppLoader />;
  }

  if (user) {
    const destination = location.state?.from
      ? `${location.state.from.pathname}${location.state.from.search || ''}`
      : '/personal';
    return <Navigate to={destination} replace />;
  }

  return children;
};

export const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <GlobalAppLoader />;
  }

  return <Navigate to={user ? '/personal' : '/login'} replace />;
};

export const AppRoutes = ({ MainApp }) => {
  return (
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
  );
};

