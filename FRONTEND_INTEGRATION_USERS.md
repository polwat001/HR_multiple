# Frontend Integration Guide - Users API

This guide shows how to integrate the `/api/users` endpoints in your React/Next.js frontend using the existing `apiGet`, `apiPost`, `apiPut`, `apiDelete` functions from `src/lib/api.ts`.

---

## Types Definition

Add these TypeScript types to `src/types/users.ts`:

```typescript
export interface User {
  id: number;
  username: string;
  email: string;
  status: 'active' | 'inactive';
  last_login: string | null;
  created_at: string;
  roles?: string; // Comma-separated role names
  companies?: string | null;
}

export interface UserDetail extends User {
  role_ids: string; // Comma-separated role IDs
  company_ids: string | null;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  status?: 'active' | 'inactive';
  roles?: number[];
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  status?: 'active' | 'inactive';
}

export interface AssignRoleRequest {
  role_id: number;
  company_id?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface UsersApiResponse<T> {
  message: string;
  data?: T;
  count?: number;
}
```

---

## API Service Functions

Create `src/services/userService.ts`:

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { User, UserDetail, CreateUserRequest, UpdateUserRequest, AssignRoleRequest, ChangePasswordRequest, UsersApiResponse } from '@/types/users';

export const userService = {
  /**
   * Get all users (HR Company+ only)
   */
  async getAllUsers(): Promise<User[]> {
    const response = await apiGet('/users');
    return Array.isArray(response) ? response : response?.data || [];
  },

  /**
   * Get a specific user by ID with role details
   */
  async getUserById(id: number): Promise<UserDetail> {
    return await apiGet(`/users/${id}`);
  },

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    return await apiPost('/users', userData);
  },

  /**
   * Update user information (username, email, status)
   */
  async updateUser(id: number, updates: UpdateUserRequest): Promise<void> {
    await apiPut(`/users/${id}`, updates);
  },

  /**
   * Delete a user (Super Admin only)
   */
  async deleteUser(id: number): Promise<void> {
    await apiDelete(`/users/${id}`);
  },

  /**
   * Assign a role to a user
   */
  async assignRole(userId: number, roleData: AssignRoleRequest): Promise<void> {
    await apiPost(`/users/${userId}/assign-role`, roleData);
  },

  /**
   * Remove a role from a user
   */
  async removeRole(userId: number, roleId: number): Promise<void> {
    await apiDelete(`/users/${userId}/remove-role`, { role_id: roleId });
  },

  /**
   * Change password for a user
   */
  async changePassword(userId: number, passwordData: ChangePasswordRequest): Promise<void> {
    await apiPut(`/users/${userId}/change-password`, passwordData);
  },
};
```

---

## Usage in Components

### Example 1: List Users Component

```typescript
// src/routes/UserManagement.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/userService';
import { User } from '@/types/users';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkPermission } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure?')) return;
    
    try {
      await userService.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!checkPermission('MANAGE_USERS')) {
    return <div>No permission to manage users</div>;
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      
      <Button className="mb-4">+ Create New User</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.username}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{user.roles}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                  {user.status}
                </Badge>
              </TableCell>
              <TableCell>{user.last_login || '-'}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">Edit</Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeleteUser(user.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
```

### Example 2: Create User Form

```typescript
// src/components/CreateUserForm.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { userService } from '@/services/userService';
import { CreateUserRequest } from '@/types/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const ROLE_OPTIONS = [
  { id: 1, name: 'Employee' },
  { id: 2, name: 'Manager' },
  { id: 3, name: 'HR Company' },
  { id: 4, name: 'Central HR' },
  { id: 5, name: 'Super Admin' },
];

export const CreateUserForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateUserRequest>();
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: CreateUserRequest) => {
    try {
      setLoading(true);
      await userService.createUser({
        ...data,
        roles: selectedRoles,
      });
      reset();
      setSelectedRoles([]);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create user:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          {...register('username', { required: 'Username is required' })}
          disabled={loading}
        />
        {errors.username && <span className="text-red-600">{errors.username.message}</span>}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email', { required: 'Email is required' })}
          disabled={loading}
        />
        {errors.email && <span className="text-red-600">{errors.email.message}</span>}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          {...register('password', { required: 'Password is required' })}
          disabled={loading}
        />
        {errors.password && <span className="text-red-600">{errors.password.message}</span>}
      </div>

      <div>
        <Label>Roles</Label>
        <div className="space-y-2">
          {ROLE_OPTIONS.map(role => (
            <div key={role.id} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role.id}`}
                checked={selectedRoles.includes(role.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedRoles([...selectedRoles, role.id]);
                  } else {
                    setSelectedRoles(selectedRoles.filter(r => r !== role.id));
                  }
                }}
                disabled={loading}
              />
              <label htmlFor={`role-${role.id}`}>{role.name}</label>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
};
```

### Example 3: Change Password

```typescript
// src/components/ChangePasswordDialog.tsx
import { useState } from 'react';
import { userService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const ChangePasswordDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await userService.changePassword(user!.id, {
        oldPassword,
        newPassword,
      });
      
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}
          
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <Input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Error Handling Pattern

The existing api.ts functions throw errors, so wrap calls in try-catch:

```typescript
try {
  const users = await userService.getAllUsers();
  // Use users...
} catch (error) {
  if (error instanceof Error) {
    // Handle specific error message
    console.error('API Error:', error.message);
  }
  // Show user-friendly error UI
}
```

---

## Integration Checklist

- [ ] Create `src/types/users.ts` with TypeScript interfaces
- [ ] Create `src/services/userService.ts` with API wrapper functions
- [ ] Build `src/routes/UserManagement.tsx` page component
- [ ] Add permission check component for 'MANAGE_USERS' permission in RoleGuard
- [ ] Create forms for Create/Update/Delete user operations
- [ ] Add Change Password dialog component
- [ ] Test with different user roles to verify permissions
- [ ] Add error handling and loading states throughout

---

## Next Steps

Once user management is integrated:

1. **Employee Management** - Similar pattern for `/api/employees`
2. **Leave Management** - For `/api/leaves`
3. **Contract Management** - For `/api/contracts`
4. **Attendance/OT** - For `/api/attendance`
5. **Reports** - For `/api/reports`

Each following the same service + component pattern.
