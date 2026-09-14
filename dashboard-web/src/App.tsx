import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Players } from './pages/Players';
import { Groups } from './pages/Groups';
import { World } from './pages/World';
import { Performance } from './pages/Performance';
import { Logs } from './pages/Logs';
import { Activity } from './pages/Activity';
import { Chat } from './pages/Chat';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { SetupWizard } from './pages/SetupWizard';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isSetupRequired, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Connecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (isSetupRequired) {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<SetupWizard />} />
      </Route>

      {/* Protected dashboard routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/players" element={<Players />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/world" element={<World />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
