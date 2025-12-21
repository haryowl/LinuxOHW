// frontend/src/components/ProtectedRoute.js

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children, requiredPermission = null }) => {
  const { user, loading, hasMenuAccess } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no specific permission required, just check if user is authenticated
  if (!requiredPermission) {
    return children;
  }

  // Check if user has access to this route
  if (!hasMenuAccess(requiredPermission)) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <Typography variant="h4" color="error" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          You don't have permission to access this page.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please contact your administrator for access.
        </Typography>
      </Box>
    );
  }

  return children;
};

export default ProtectedRoute;
