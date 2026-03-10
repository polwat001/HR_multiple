# Backend Integration Guide - User Roles & Permissions

This guide shows how the backend should structure user data with roles for the frontend RBAC system.

## User Response Structure

When a user logs in or the frontend requests `/auth/me`, return user data in this format:

```json
{
  "user_id": 1,
  "username": "john.doe",
  "email": "john.doe@company.com",
  "role": "Manager",
  "roles": ["Manager"],
  "company_id": "COMP001",
  "department_id": "ACC",
  "name": "John Doe"
}
```

If user has multiple roles:

```json
{
  "user_id": 2,
  "username": "jane.smith",
  "email": "jane.smith@company.com",
  "role": "HR Company",
  "roles": ["Manager", "HR Company"],
  "company_id": "COMP001",
  "department_id": "ACC",
  "name": "Jane Smith"
}
```

For Super Admin:

```json
{
  "user_id": 999,
  "username": "admin.user",
  "email": "admin@company.com",
  "role": "Super Admin",
  "roles": ["Super Admin"],
  "company_id": null,
  "department_id": null,
  "name": "System Administrator"
}
```

## User Roles Table Structure

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  company_id VARCHAR(50),
  department_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE user_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

-- Seed roles
INSERT INTO roles (role_name, description) VALUES
('Employee', 'Basic employee with personal data access'),
('Manager', 'Department manager with team oversight'),
('HR Company', 'HR specialist for a specific company'),
('Central HR', 'Central HR with multi-company access'),
('Super Admin', 'System administrator with full access');
```

## Node.js / Express Implementation Example

### 1. Get User with Roles

```javascript
// controller/authController.js
const getMe = async (req, res) => {
  try {
    const userId = req.user.user_id; // From JWT token

    // Get user basic info
    const userQuery = `
      SELECT 
        u.id AS user_id,
        u.username,
        u.email,
        u.company_id,
        u.department_id,
        CONCAT(u.first_name, ' ', u.last_name) AS name
      FROM users u
      WHERE u.id = ?
    `;

    const [users] = await db.execute(userQuery, [userId]);
    if (!users.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // Get user roles
    const rolesQuery = `
      SELECT role_name
      FROM user_roles
      WHERE user_id = ?
      ORDER BY created_at ASC
    `;

    const [roles] = await db.execute(rolesQuery, [userId]);
    const roleNames = roles.map(r => r.role_name);

    // Primary role is the first role
    const primaryRole = roleNames[0] || 'Employee';

    res.json({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: primaryRole,
      roles: roleNames,
      company_id: user.company_id,
      department_id: user.department_id,
      name: user.name
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    res.status(500).json({ message: 'Failed to fetch user data' });
  }
};

module.exports = { getMe };
```

### 2. Login Endpoint Response

```javascript
// Add this to your login controller
const login = async (req, res) => {
  // ... existing login validation ...

  // Get user roles
  const rolesQuery = `
    SELECT role_name
    FROM user_roles
    WHERE user_id = ?
  `;
  const [roles] = await db.execute(rolesQuery, [user.user_id]);
  const roleNames = roles.map(r => r.role_name);
  const primaryRole = roleNames[0] || 'Employee';

  // Create JWT payload
  const payload = {
    user_id: user.user_id,
    username: user.username,
    roles: roleNames,
    primary_role: primaryRole,
    company_id: user.company_id,
    department_id: user.department_id
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({
    message: 'Login successful',
    token: token,
    user: {
      user_id: user.user_id,
      username: user.username,
      role: primaryRole,
      roles: roleNames,
      company_id: user.company_id,
      department_id: user.department_id
    }
  });
};
```

### 3. Assign Role to User

```javascript
// controller/userController.js
const assignRole = async (req, res) => {
  try {
    const { userId, roleName } = req.body;

    // Verify role exists
    const roleQuery = 'SELECT * FROM roles WHERE role_name = ?';
    const [roles] = await db.execute(roleQuery, [roleName]);

    if (!roles.length) {
      return res.status(400).json({ message: 'Role does not exist' });
    }

    // Insert or ignore if already assigned
    const assignQuery = `
      INSERT IGNORE INTO user_roles (user_id, role_name)
      VALUES (?, ?)
    `;

    await db.execute(assignQuery, [userId, roleName]);

    res.json({ message: 'Role assigned successfully' });
  } catch (error) {
    console.error('Assign Role Error:', error);
    res.status(500).json({ message: 'Failed to assign role' });
  }
};

// Remove role from user
const removeRole = async (req, res) => {
  try {
    const { userId, roleName } = req.body;

    const query = `
      DELETE FROM user_roles
      WHERE user_id = ? AND role_name = ?
    `;

    await db.execute(query, [userId, roleName]);

    res.json({ message: 'Role removed successfully' });
  } catch (error) {
    console.error('Remove Role Error:', error);
    res.status(500).json({ message: 'Failed to remove role' });
  }
};

module.exports = { assignRole, removeRole };
```

### 4. Permission Middleware

```javascript
// middleware/permissionMiddleware.js
const permissionMapping = {
  // Employee permissions
  'view_own_dashboard': ['Employee', 'Manager', 'HR Company', 'Central HR', 'Super Admin'],
  'view_own_profile': ['Employee', 'Manager', 'HR Company', 'Central HR', 'Super Admin'],
  
  // Manager permissions
  'view_department_employees': ['Manager', 'HR Company', 'Central HR', 'Super Admin'],
  'approve_department_ot': ['Manager', 'HR Company', 'Central HR', 'Super Admin'],
  'approve_department_leave': ['Manager', 'HR Company', 'Central HR', 'Super Admin'],
  
  // HR Company permissions
  'manage_company_employees': ['HR Company', 'Central HR', 'Super Admin'],
  'manage_company_ot': ['HR Company', 'Central HR', 'Super Admin'],
  'manage_company_leave': ['HR Company', 'Central HR', 'Super Admin'],
  
  // Central HR permissions
  'view_all_employees': ['Central HR', 'Super Admin'],
  'manage_all_ot': ['Central HR', 'Super Admin'],
  'manage_all_leave': ['Central HR', 'Super Admin'],
  
  // Admin permissions
  'manage_users': ['Super Admin'],
  'manage_system': ['Super Admin'],
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    // Get user roles from JWT
    const userRoles = req.user.roles || [req.user.primary_role];
    const allowedRoles = permissionMapping[permission] || [];

    const hasPermission = userRoles.some(role => allowedRoles.includes(role));

    if (!hasPermission) {
      return res.status(403).json({
        message: 'Insufficient permissions',
        required_permission: permission
      });
    }

    next();
  };
};

module.exports = { requirePermission };
```

### 5. Data Filtering by User Role

```javascript
// controller/employeeController.js
const getEmployees = async (req, res) => {
  try {
    const userRoles = req.user.roles || [req.user.primary_role];
    let whereClause = '';
    let params = [];

    if (userRoles.includes('Employee')) {
      // Employee sees only themselves
      whereClause = 'WHERE e.user_id = ?';
      params = [req.user.user_id];
    } else if (userRoles.includes('Manager') && !userRoles.includes('HR Company')) {
      // Manager sees their department
      whereClause = 'WHERE e.department_id = ?';
      params = [req.user.department_id];
    } else if (userRoles.includes('HR Company') && !userRoles.includes('Central HR')) {
      // HR Company sees their company
      whereClause = 'WHERE e.company_id = ?';
      params = [req.user.company_id];
    }
    // Central HR and Super Admin see all (no filter)

    const query = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.position,
        e.department_id,
        e.company_id,
        e.status
      FROM employees e
      ${whereClause}
      ORDER BY e.first_name ASC
    `;

    const [employees] = await db.execute(query, params);
    res.json(employees);
  } catch (error) {
    console.error('Get Employees Error:', error);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
};

module.exports = { getEmployees };
```

### 6. Route Protection

```javascript
// routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const employeeController = require('../controllers/employeeController');

// All routes require authentication
router.use(authMiddleware);

// GET / - View employees (based on role)
router.get('/', 
  requirePermission('view_own_profile'),
  employeeController.getEmployees
);

// POST / - Create employee (only HR Company and above)
router.post('/',
  requirePermission('manage_company_employees'),
  employeeController.createEmployee
);

// PUT /:id - Update employee (scope-dependent)
router.put('/:id',
  requirePermission('manage_company_employees'),
  employeeController.updateEmployee
);

module.exports = router;
```

## Testing with Postman

```
POST http://localhost:5000/api/auth/login
Body:
{
  "username": "john.doe",
  "password": "123456"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": 1,
    "username": "john.doe",
    "role": "Manager",
    "roles": ["Manager"],
    "company_id": "COMP001",
    "department_id": "ACC"
  }
}

Then use token in Authorization header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

GET http://localhost:5000/api/auth/me
→ Returns user info with roles
```

## MySQL Seed Script

```sql
-- Create roles
INSERT IGNORE INTO roles (role_name, description) VALUES
('Employee', 'Basic employee'),
('Manager', 'Department manager'),
('HR Company', 'HR specialist'),
('Central HR', 'Corporate HR'),
('Super Admin', 'System admin');

-- Create sample users
INSERT INTO users (username, email, password_hash, first_name, last_name, company_id, department_id) VALUES
('emp001', 'emp001@company.com', '$2b$10$...hash...', 'Alice', 'Employee', 'COMP001', 'ACC'),
('mgr001', 'mgr001@company.com', '$2b$10$...hash...', 'Bob', 'Manager', 'COMP001', 'ACC'),
('hr001', 'hr001@company.com', '$2b$10$...hash...', 'Carol', 'HR', 'COMP001', NULL),
('hr_central', 'hr.central@company.com', '$2b$10$...hash...', 'David', 'Central', NULL, NULL),
('admin', 'admin@company.com', '$2b$10$...hash...', 'System', 'Admin', NULL, NULL);

-- Assign roles
INSERT INTO user_roles (user_id, role_name) VALUES
(1, 'Employee'),
(2, 'Manager'),
(3, 'HR Company'),
(4, 'Central HR'),
(5, 'Super Admin');

-- Multi-role example: Bob is both Manager and Acting HR
INSERT INTO user_roles (user_id, role_name) VALUES
(2, 'HR Company');
```

This structure ensures that:
- ✅ User roles are flexible and maintainable
- ✅ Frontend can determine visible features
- ✅ Backend enforces actual access control
- ✅ Data is properly filtered by user scope
- ✅ Multi-role assignments are supported
