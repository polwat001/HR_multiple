# Users Management API Documentation

## Overview

This API provides complete user management functionality including CRUD operations, role assignment, and password management.

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Authorization

Different endpoints require different permission levels:

- **View Users (GET)**: Requires `role_level >= 50` (HR Company and above)
- **Create/Update Users (POST/PUT)**: Requires `role_level >= 50` (HR Company and above)
- **Delete Users (DELETE)**: Requires `role_level == 99` (Super Admin only)
- **Assign/Remove Roles**: Requires `role_level >= 50` (HR Company and above)
- **Change Password**: Users can only change their own password

---

## Endpoints

### 1. Get All Users

**GET** `/api/users`

Returns a list of all users (filtered by company for HR Company users).

#### Request Headers

```
Authorization: Bearer <jwt_token>
```

#### Response

```json
{
  "message": "ดึงข้อมูลบัญชีผู้ใช้งานสำเร็จ",
  "count": 5,
  "data": [
    {
      "id": 1,
      "username": "admin_central",
      "email": "admin@company.com",
      "status": "active",
      "last_login": "2026-03-10 10:38:52",
      "created_at": "2026-03-04 17:04:38",
      "roles": "Super Admin",
      "companies": null
    },
    {
      "id": 2,
      "username": "hr_tech",
      "email": "hr@tech.com",
      "status": "active",
      "last_login": null,
      "created_at": "2026-03-04 17:04:38",
      "roles": "HR Company",
      "companies": "บริษัท เทคโนโลยี่"
    }
  ]
}
```

#### Status Codes

- `200` - Success
- `403` - Insufficient permissions

---

### 2. Get User by ID

**GET** `/api/users/:id`

Returns detailed information for a specific user including their roles and company assignments.

#### Request Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

#### Response

```json
{
  "message": "ดึงข้อมูลสำเร็จ",
  "data": {
    "id": 2,
    "username": "hr_tech",
    "email": "hr@tech.com",
    "status": "active",
    "last_login": null,
    "created_at": "2026-03-04 17:04:38",
    "role_ids": "3",
    "roles": "HR Company",
    "company_ids": "COMP001"
  }
}
```

#### Status Codes

- `200` - Success
- `403` - Insufficient permissions
- `404` - User not found

---

### 3. Create New User

**POST** `/api/users`

Creates a new user account with specified roles.

#### Request Body

```json
{
  "username": "emp_new",
  "email": "emp@company.com",
  "password": "SecurePass123!",
  "status": "active",
  "roles": [1]
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| username | string | Yes | Unique username |
| email | string | Yes | Unique email address |
| password | string | Yes | Password (minimum 8 characters recommended) |
| status | string | No | "active" or "inactive" (default: "active") |
| roles | array | No | Array of role IDs to assign |

#### Response

```json
{
  "message": "สร้างผู้ใช้งานสำเร็จ",
  "data": {
    "id": 11,
    "username": "emp_new",
    "email": "emp@company.com",
    "status": "active"
  }
}
```

#### Status Codes

- `201` - Created successfully
- `400` - Missing required fields
- `403` - Insufficient permissions
- `409` - Username or email already exists

---

### 4. Update User

**PUT** `/api/users/:id`

Updates user information (username, email, status).

#### Request Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

#### Request Body

```json
{
  "username": "emp_updated",
  "email": "newemail@company.com",
  "status": "inactive"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| username | string | No | New username |
| email | string | No | New email |
| status | string | No | "active" or "inactive" |

#### Response

```json
{
  "message": "อัปเดตไข่มูลสำเร็จ"
}
```

#### Status Codes

- `200` - Updated successfully
- `400` - No fields to update
- `403` - Insufficient permissions
- `404` - User not found

---

### 5. Delete User

**DELETE** `/api/users/:id`

⚠️ **Super Admin Only**

Permanently deletes a user account and all associated roles.

#### Request Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

#### Response

```json
{
  "message": "ลบผู้ใช้งานสำเร็จ"
}
```

#### Status Codes

- `200` - Deleted successfully
- `403` - Only Super Admin can delete users
- `404` - User not found

---

### 6. Assign Role to User

**POST** `/api/users/:id/assign-role`

Assigns a role to a user. Users can have multiple roles.

#### Request Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

#### Request Body

```json
{
  "role_id": 2,
  "company_id": "COMP001"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role_id | integer | Yes | ID of the role to assign |
| company_id | string | No | Company ID (uses current user's company if not provided) |

#### Response

```json
{
  "message": "กำหนด role สำเร็จ"
}
```

#### Status Codes

- `200` - Role assigned successfully
- `400` - Missing role_id
- `403` - Insufficient permissions
- `404` - User or role not found

---

### 7. Remove Role from User

**DELETE** `/api/users/:id/remove-role`

Removes a specific role from a user.

#### Request Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

#### Request Body

```json
{
  "role_id": 2
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role_id | integer | Yes | ID of the role to remove |

#### Response

```json
{
  "message": "เอา role ออกสำเร็จ"
}
```

#### Status Codes

- `200` - Role removed successfully
- `400` - Missing role_id
- `403` - Insufficient permissions

---

### 8. Change Password

**PUT** `/api/users/:id/change-password`

Changes a user's password. Users can only change their own password.

#### Request Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

#### Request Body

```json
{
  "oldPassword": "CurrentPassword123!",
  "newPassword": "NewPassword456!"
}
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| oldPassword | string | Yes | Current password |
| newPassword | string | Yes | New password |

#### Response

```json
{
  "message": "เปลี่ยนรหัสผ่านสำเร็จ"
}
```

#### Status Codes

- `200` - Password changed successfully
- `400` - Missing fields
- `401` - Old password is incorrect
- `403` - Can only change own password
- `404` - User not found

---

## Role IDs Reference

```
1 = Employee
2 = Manager
3 = HR Company
4 = Central HR
5 = Super Admin
```

---

## Usage Examples

### Example 1: Create a new HR Company user

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "username": "hr_company1",
    "email": "hr@company1.com",
    "password": "SecurePass123!",
    "status": "active",
    "roles": [3]
  }'
```

### Example 2: Assign multiple roles to a user

```bash
# First assign Manager role
curl -X POST http://localhost:5000/api/users/5/assign-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "role_id": 2,
    "company_id": "COMP001"
  }'

# Then assign HR Company role
curl -X POST http://localhost:5000/api/users/5/assign-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "role_id": 3,
    "company_id": "COMP001"
  }'
```

### Example 3: Update user status to inactive

```bash
curl -X PUT http://localhost:5000/api/users/10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "status": "inactive"
  }'
```

### Example 4: Change own password

```bash
curl -X PUT http://localhost:5000/api/users/5/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "oldPassword": "OldPass123!",
    "newPassword": "NewPass456!"
  }'
```

---

## Error Responses

All error responses follow this format:

```json
{
  "message": "Error description"
}
```

Common errors:

| Status | Message |
|--------|---------|
| 400 | ไม่มีข้อมูลที่ต้องแก้ไข |
| 403 | คุณไม่มีสิทธิ์เข้าถึงข้อมูลบัญชีผู้ใช้งาน |
| 404 | ไม่พบผู้ใช้งาน |
| 409 | Username หรือ Email นี้มีอยู่แล้ว |
| 500 | เกิดข้อผิดพลาดในการประมวลผล |

---

## Access Control Summary

| Endpoint | Role Required | Notes |
|----------|---------------|-------|
| GET /api/users | HR Company+ | Filters by company for HR Company |
| GET /api/users/:id | HR Company+ | - |
| POST /api/users | HR Company+ | - |
| PUT /api/users/:id | HR Company+ | - |
| DELETE /api/users/:id | Super Admin | Highest privilege required |
| POST /api/users/:id/assign-role | HR Company+ | - |
| DELETE /api/users/:id/remove-role | HR Company+ | - |
| PUT /api/users/:id/change-password | User (own) | Users can only change own password |
