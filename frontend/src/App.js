// frontend/src/App.js

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { SnackbarProvider } from 'notistack';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { DataProvider } from './contexts/DataContext';
import { AppThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const DeviceList = lazy(() => import('./pages/DeviceList'));
const DeviceDetail = lazy(() => import('./pages/DeviceDetail'));
const Mapping = lazy(() => import('./pages/Mapping'));
const Tracking = lazy(() => import('./pages/Tracking'));
const Settings = lazy(() => import('./pages/Settings'));
const Alerts = lazy(() => import('./pages/Alerts'));
const DataTablePage = lazy(() => import('./pages/DataTable'));
const DataExport = lazy(() => import('./pages/DataExport'));
const DataSM = lazy(() => import('./pages/DataSM'));
const OfflineGridDemo = lazy(() => import('./components/OfflineGridDemo'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const DeviceGroupManagement = lazy(() => import('./pages/DeviceGroupManagement'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const MultiTracking = lazy(() => import('./pages/MultiTracking'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const ArchiveStat = lazy(() => import('./pages/ArchiveStat'));

function PageLoader() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
      <CircularProgress />
    </Box>
  );
}

function LazyPage({ children }) {
  return (
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <AppContent />
      </AppThemeProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AuthProvider>
            <WebSocketProvider>
              <DataProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={
                    <ProtectedRoute requiredPermission="dashboard">
                      <Layout><LazyPage><Dashboard /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/devices" element={
                    <ProtectedRoute requiredPermission="devices">
                      <Layout><LazyPage><DeviceList /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/devices/:id" element={
                    <ProtectedRoute requiredPermission="devices">
                      <Layout><LazyPage><DeviceDetail /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/mapping" element={
                    <ProtectedRoute requiredPermission="mapping">
                      <Layout><LazyPage><Mapping /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/tracking" element={
                    <ProtectedRoute requiredPermission="tracking">
                      <Layout><LazyPage><Tracking /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/multi-tracking" element={
                    <ProtectedRoute requiredPermission="tracking">
                      <Layout><LazyPage><MultiTracking /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute requiredPermission="settings">
                      <Layout><LazyPage><Settings /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/alerts" element={
                    <ProtectedRoute requiredPermission="alerts">
                      <Layout><LazyPage><Alerts /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/data" element={
                    <ProtectedRoute requiredPermission="data">
                      <Layout><LazyPage><DataTablePage /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/export" element={
                    <ProtectedRoute requiredPermission="export">
                      <Layout><LazyPage><DataExport /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/data-sm" element={
                    <ProtectedRoute requiredPermission="data-sm">
                      <Layout><LazyPage><DataSM /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/demo" element={
                    <ProtectedRoute requiredPermission="demo">
                      <Layout><LazyPage><OfflineGridDemo /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/user-management" element={
                    <ProtectedRoute requiredPermission="user-management">
                      <Layout><LazyPage><UserManagement /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/role-management" element={
                    <ProtectedRoute requiredPermission="user-management">
                      <Layout><LazyPage><RoleManagement /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/device-groups" element={
                    <ProtectedRoute requiredPermission="device-groups">
                      <Layout><LazyPage><DeviceGroupManagement /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/command-center" element={
                    <ProtectedRoute requiredPermission="devices">
                      <Layout><LazyPage><CommandCenter /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/archive-stat" element={
                    <ProtectedRoute requiredPermission="devices">
                      <Layout><LazyPage><ArchiveStat /></LazyPage></Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </DataProvider>
            </WebSocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </SnackbarProvider>
    </LocalizationProvider>
  );
}

export default App;
