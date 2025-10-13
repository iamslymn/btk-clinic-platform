import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <div className="flex-1 ml-64">
          <Header />
          <main className="py-6 px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}