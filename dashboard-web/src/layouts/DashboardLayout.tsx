import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-950 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
