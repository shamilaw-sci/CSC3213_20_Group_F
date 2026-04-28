import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar is fixed, so it sits on top of the left side */}
      <Sidebar />
      
      {/* Main Content Area 
        'ml-64' is the key: it creates a left margin equal to the sidebar width,
        ensuring the content stays to the right of the sidebar.
      */}
      <div className="flex-1 flex flex-col overflow-y-auto ml-64">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
           <h2 className="text-lg font-semibold text-gray-700">LuminaLearn Dashboard</h2>
        </header>

        {/* Main Content Injection point */}
        <main className="flex-grow p-8">
           <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;