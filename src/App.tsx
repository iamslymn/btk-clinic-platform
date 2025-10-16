import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ROUTES, getDashboardPath } from './lib/routes';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboardWithLists from './pages/SuperAdminDashboardWithLists';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerWeeklySchedule from './pages/ManagerWeeklySchedule';
import RepresentativeDashboard from './pages/RepresentativeDashboard';
import DoctorsPage from './pages/DoctorsPage';
import CreateDoctorPage from './pages/CreateDoctorPage';
import EditDoctorPage from './pages/EditDoctorPage';
import RepresentativesPage from './pages/RepresentativesPage';
import CreateRepresentativePage from './pages/CreateRepresentativePage';
import AssignmentsPage from './pages/AssignmentsPage';
import BrandsPage from './pages/BrandsPage';
import ProductsPage from './pages/ProductsPage';
import SchedulePage from './pages/SchedulePage';
import VisitsPage from './pages/VisitsPage';
import RepBrandsPage from './pages/RepBrandsPage';
import ReportsPage from './pages/ReportsPage';
import LoadingSpinner from './components/LoadingSpinner';
import NotificationsPage from './pages/NotificationsPage';
import AdminVisitHistoryPage from './pages/AdminVisitHistoryPage';

function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  try {
    const { user, role, loading } = useAuth();

    if (loading) {
      return <LoadingSpinner />;
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles && role && !allowedRoles.includes(role)) {
      return <Navigate to="/unauthorized" replace />;
    }

    return <>{children}</>;
  } catch (error) {
    console.error('Auth context error in ProtectedRoute:', error);
    return <Navigate to="/login" replace />;
  }
}

function DashboardRedirect() {
  try {
    const { role, loading } = useAuth();

    if (loading) {
      return <LoadingSpinner />;
    }

    const dashboardPath = getDashboardPath(role || '');
    return <Navigate to={dashboardPath} replace />;
  } catch (error) {
    console.error('Auth context error in DashboardRedirect:', error);
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      
      {/* Dashboard redirect */}
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/" element={<DashboardRedirect />} />

      {/* Super Admin routes - canonical structure */}
      <Route 
        path="/super-admin/*" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdminDashboardWithLists />
          </ProtectedRoute>
        } 
      />

      {/* Legacy redirect for old super admin routes */}
      <Route 
        path="/dashboard/super-admin/*" 
        element={<Navigate to="/super-admin/dashboard" replace />} 
      />

      {/* Manager routes */}
      <Route 
        path="/dashboard/manager/*" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Shared Notifications */}
      <Route 
        path="/notifications" 
        element={
          <ProtectedRoute allowedRoles={['super_admin','manager','rep']}>
            <NotificationsPage />
          </ProtectedRoute>
        } 
      />

      {/* Visit History for Admins and Managers */}
      <Route 
        path="/super-admin/visit-history" 
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminVisitHistoryPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manager/visit-history" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <AdminVisitHistoryPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/doctors" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <DoctorsPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/doctors/create" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <CreateDoctorPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/doctors/:id/edit" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <EditDoctorPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/representatives" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <RepresentativesPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/representatives/create" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <CreateRepresentativePage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/assignments" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <AssignmentsPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/brands" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <BrandsPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/products" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ProductsPage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ReportsPage />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/manager/weekly-schedule" 
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerWeeklySchedule />
          </ProtectedRoute>
        } 
      />

      {/* Representative routes */}
      <Route 
        path="/dashboard/rep/*" 
        element={
          <ProtectedRoute allowedRoles={['rep']}>
            <RepresentativeDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/schedule" 
        element={
          <ProtectedRoute allowedRoles={['rep']}>
            <SchedulePage />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/visits" 
        element={
          <ProtectedRoute allowedRoles={['rep']}>
            <VisitsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/rep/brands" 
        element={
          <ProtectedRoute allowedRoles={['rep']}>
            <RepBrandsPage />
          </ProtectedRoute>
        } 
      />

      {/* Error routes */}
      <Route 
        path="/unauthorized" 
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Unauthorized</h1>
              <p className="text-gray-600 mb-8">You don't have permission to access this page.</p>
              <button 
                onClick={() => window.history.back()}
                className="btn-primary"
              >
                Go Back
              </button>
            </div>
          </div>
        } 
      />
      
      <Route 
        path="*" 
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
              <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
              <button 
                onClick={() => window.location.href = '/'}
                className="btn-primary"
              >
                Go Home
              </button>
            </div>
          </div>
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}