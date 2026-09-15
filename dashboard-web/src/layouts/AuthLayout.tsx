import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#1e1e1f] flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-md relative z-10">
        <Outlet />
      </div>
      <div className="mt-8 text-center text-xs font-heading text-[#888888] select-none">
        MINECRAFT DEDICATED SERVER DASHBOARD · 26.2
      </div>
    </div>
  );
};
