
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import ErrorBoundary from './ErrorBoundary';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex">
        <ErrorBoundary>
          <Sidebar />
        </ErrorBoundary>
        <div className="flex-1 flex flex-col">
          <ErrorBoundary>
            <Header />
          </ErrorBoundary>
          <main className="flex-1 p-6">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
