import React from 'react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - fixed width */}
      <Sidebar />
      
      {/* Main Content Area - takes up the rest of the screen */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <main className="flex-grow flex items-center justify-center p-8">
           {/* The form will be injected here and perfectly centered */}
           <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;