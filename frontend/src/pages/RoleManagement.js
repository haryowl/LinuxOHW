import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon2,
  Delete as DeleteIcon2
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';

// API functions for role management
const apiFetchRoles = async () => {
  const response = await fetch('/api/roles', {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch roles');
  return response.json();
};

const apiCreateRole = async (roleData) => {
  const response = await fetch('/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(roleData)
  });
  if (!response.ok) throw new Error('Failed to create role');
  return response.json();
};

const apiUpdateRole = async (roleId, roleData) => {
  const response = await fetch(`/api/roles/${roleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(roleData)
  });
  if (!response.ok) throw new Error('Failed to update role');
  return response.json();
};

const apiDeleteRole = async (roleId) => {
  const response = await fetch(`/api/roles/${roleId}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to delete role');
  return response.json();
};

const apiFetchAvailablePermissions = async () => {
  const response = await fetch('/api/roles/permissions/available', {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch permissions');
  return response.json();
};

const RoleManagement = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availablePermissions, setAvailablePermissions] = useState({});
  
  // Dialog states
  const [roleDialog, setRoleDialog] = useState({ open: false, editing: null });
  const [permissionDialog, setPermissionDialog] = useState({ open: false, role: null });
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: {
      menus: {},
      modules: {},
      deviceAccess: { type: 'all', groups: [], devices: [] },
      special: {}
    }
  });

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const [rolesData, permissionsData] = await Promise.all([
        apiFetchRoles(),
        apiFetchAvailablePermissions()
      ]);
      
      setRoles(rolesData);
      setAvailablePermissions(permissionsData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load roles and permissions');
      enqueueSnackbar('Failed to load data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle role form submission
  const handleRoleSubmit = async () => {
    try {
      if (roleDialog.editing) {
        await apiUpdateRole(roleDialog.editing.id, roleForm);
        enqueueSnackbar('Role updated successfully', { variant: 'success' });
      } else {
        await apiCreateRole(roleForm);
        enqueueSnackbar('Role created successfully', { variant: 'success' });
      }
      
      setRoleDialog({ open: false, editing: null });
      setRoleForm({ name: '', description: '', permissions: { menus: {}, modules: {}, deviceAccess: { type: 'all', groups: [], devices: [] }, special: {} } });
      loadData();
    } catch (error) {
      console.error('Error saving role:', error);
      enqueueSnackbar(error.message || 'Failed to save role', { variant: 'error' });
    }
  };

  // Handle role deletion
  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      await apiDeleteRole(role.id);
      enqueueSnackbar('Role deleted successfully', { variant: 'success' });
      loadData();
    } catch (error) {
      console.error('Error deleting role:', error);
      enqueueSnackbar(error.message || 'Failed to delete role', { variant: 'error' });
    }
  };

  // Open role dialog
  const openRoleDialog = (role = null) => {
    if (role) {
      setRoleForm({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions
      });
      setRoleDialog({ open: true, editing: role });
    } else {
      setRoleForm({
        name: '',
        description: '',
        permissions: {
          menus: {},
          modules: {},
          deviceAccess: { type: 'all', groups: [], devices: [] },
          special: {}
        }
      });
      setRoleDialog({ open: true, editing: null });
    }
  };

  // Handle permission changes
  const handlePermissionChange = (category, item, action, value) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [category]: {
          ...prev.permissions[category],
          [item]: {
            ...prev.permissions[category][item],
            [action]: value
          }
        }
      }
    }));
  };

  // Handle special permission changes
  const handleSpecialPermissionChange = (permission, value) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        special: {
          ...prev.permissions.special,
          [permission]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Role Management
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openRoleDialog()}
          >
            Create Role
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage user roles and configure detailed permissions for system access.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {roles.map((role) => (
          <Grid item xs={12} md={6} lg={4} key={role.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" component="h2">
                      {role.name}
                    </Typography>
                    <Chip
                      label={role.isSystem ? 'System' : 'Custom'}
                      size="small"
                      color={role.isSystem ? 'primary' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box>
                    {!role.isSystem && (
                      <>
                        <Tooltip title="Edit Role">
                          <IconButton
                            size="small"
                            onClick={() => openRoleDialog(role)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Role">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteRole(role)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {role.description || 'No description provided'}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PeopleIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {role.users?.length || 0} users assigned
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SecurityIcon />}
                  onClick={() => setPermissionDialog({ open: true, role })}
                  fullWidth
                >
                  View Permissions
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {roles.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SecurityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Roles
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first role to start managing permissions.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openRoleDialog()}
          >
            Create First Role
          </Button>
        </Paper>
      )}

      {/* Role Dialog */}
      <Dialog open={roleDialog.open} onClose={() => setRoleDialog({ open: false, editing: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          {roleDialog.editing ? 'Edit Role' : 'Create New Role'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Role Name"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={roleForm.description}
              onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
              sx={{ mb: 3 }}
            />

            <Typography variant="h6" sx={{ mb: 2 }}>
              Permissions Configuration
            </Typography>

            {/* Menu Permissions */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Menu Access</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {availablePermissions.menus?.map((menu) => (
                    <Grid item xs={12} sm={6} key={menu.value}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {menu.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            {menu.description}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={roleForm.permissions.menus[menu.value]?.access || false}
                                  onChange={(e) => handlePermissionChange('menus', menu.value, 'access', e.target.checked)}
                                />
                              }
                              label="Access"
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={roleForm.permissions.menus[menu.value]?.read || false}
                                  onChange={(e) => handlePermissionChange('menus', menu.value, 'read', e.target.checked)}
                                />
                              }
                              label="Read"
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={roleForm.permissions.menus[menu.value]?.write || false}
                                  onChange={(e) => handlePermissionChange('menus', menu.value, 'write', e.target.checked)}
                                />
                              }
                              label="Write"
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Module Permissions */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Module Permissions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {availablePermissions.modules?.map((module) => (
                    <Grid item xs={12} sm={6} key={module.value}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {module.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            {module.description}
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {['read', 'write', 'delete', 'create'].map((action) => (
                              <FormControlLabel
                                key={action}
                                control={
                                  <Switch
                                    checked={roleForm.permissions.modules[module.value]?.[action] || false}
                                    onChange={(e) => handlePermissionChange('modules', module.value, action, e.target.checked)}
                                  />
                                }
                                label={action.charAt(0).toUpperCase() + action.slice(1)}
                              />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Special Permissions */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Special Permissions</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {availablePermissions.special?.map((permission) => (
                    <Grid item xs={12} sm={6} key={permission.value}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={roleForm.permissions.special[permission.value] || false}
                            onChange={(e) => handleSpecialPermissionChange(permission.value, e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="subtitle2">
                              {permission.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {permission.description}
                            </Typography>
                          </Box>
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialog({ open: false, editing: null })}>
            Cancel
          </Button>
          <Button onClick={handleRoleSubmit} variant="contained" disabled={!roleForm.name}>
            {roleDialog.editing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission View Dialog */}
      <Dialog open={permissionDialog.open} onClose={() => setPermissionDialog({ open: false, role: null })} maxWidth="md" fullWidth>
        <DialogTitle>
          Permissions - {permissionDialog.role?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {permissionDialog.role?.description}
            </Typography>

            <Typography variant="h6" sx={{ mb: 2 }}>
              Menu Access
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {Object.entries(permissionDialog.role?.permissions?.menus || {}).map(([menu, permissions]) => (
                <Grid item xs={12} sm={6} md={4} key={menu}>
                  <Card variant="outlined">
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {menu.charAt(0).toUpperCase() + menu.slice(1).replace('-', ' ')}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {Object.entries(permissions).map(([action, enabled]) => (
                          <Chip
                            key={action}
                            label={action}
                            size="small"
                            color={enabled ? 'success' : 'default'}
                            variant={enabled ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="h6" sx={{ mb: 2 }}>
              Special Permissions
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(permissionDialog.role?.permissions?.special || {}).map(([permission, enabled]) => (
                <Grid item xs={12} sm={6} key={permission}>
                  <Chip
                    label={permission.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    color={enabled ? 'success' : 'default'}
                    variant={enabled ? 'filled' : 'outlined'}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialog({ open: false, role: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RoleManagement; 