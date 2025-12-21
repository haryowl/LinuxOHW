import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material';

const UserDialog = ({
  open,
  onClose,
  editingUser,
  userForm,
  setUserForm,
  onSubmit,
  roles,
  availableMenus
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingUser ? 'Edit User' : 'Add New User'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Username"
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              disabled={!!editingUser}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="First Name"
              value={userForm.firstName}
              onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={userForm.lastName}
              onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              helperText={editingUser ? 'Leave blank to keep current password' : ''}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                label="Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Menu Permissions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select which menus this user can access
            </Typography>
            <Grid container spacing={2}>
              {availableMenus.map((menu) => (
                <Grid item xs={12} sm={6} md={4} key={menu.value}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={userForm.permissions?.menus?.includes(menu.value) || false}
                        onChange={(e) => {
                          const currentMenus = userForm.permissions?.menus || [];
                          const newMenus = e.target.checked
                            ? [...currentMenus, menu.value]
                            : currentMenus.filter(m => m !== menu.value);
                          setUserForm({
                            ...userForm,
                            permissions: {
                              ...userForm.permissions,
                              menus: newMenus
                            }
                          });
                        }}
                      />
                    }
                    label={menu.label}
                  />
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained">
          {editingUser ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDialog; 