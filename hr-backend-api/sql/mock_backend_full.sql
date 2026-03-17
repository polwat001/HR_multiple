-- =========================================================
-- HR Backend: Full Mock Structure + Data (MySQL)
-- Run directly in MySQL client/workbench.
-- =========================================================

CREATE DATABASE IF NOT EXISTS hr_backend_mock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hr_backend_mock;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS employee_history_logs;
DROP TABLE IF EXISTS employee_attachments;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS role_permission_matrix;
DROP TABLE IF EXISTS payroll_employee_settings;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS approval_flow_configs;
DROP TABLE IF EXISTS approvals;
DROP TABLE IF EXISTS ot_requests;
DROP TABLE IF EXISTS contract_templates;
DROP TABLE IF EXISTS employee_contracts;
DROP TABLE IF EXISTS public_holidays;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS leave_balances;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS leave_policy_configs;
DROP TABLE IF EXISTS leave_types;
DROP TABLE IF EXISTS attendances;
DROP TABLE IF EXISTS work_schedules;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- 1) Core auth/role tables
CREATE TABLE roles (
  id INT NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,
  role_level INT NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','locked','inactive') DEFAULT 'active',
  last_login DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) Organization tables
CREATE TABLE companies (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NULL,
  tax_id VARCHAR(20) NULL,
  logo_url VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_companies_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE departments (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  code VARCHAR(50) NULL,
  name_th VARCHAR(100) NOT NULL,
  parent_dept_id INT NULL,
  cost_center VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_departments_company (company_id),
  KEY idx_departments_parent (parent_dept_id),
  CONSTRAINT fk_departments_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_departments_parent FOREIGN KEY (parent_dept_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE positions (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  title_th VARCHAR(100) NOT NULL,
  level INT DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_positions_company (company_id),
  CONSTRAINT fk_positions_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Employee tables
CREATE TABLE employees (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  employee_code VARCHAR(50) NOT NULL,
  firstname_th VARCHAR(100) NOT NULL,
  lastname_th VARCHAR(100) NOT NULL,
  nickname VARCHAR(50) NULL,
  id_card_number VARCHAR(20) NULL,
  company_id INT NOT NULL,
  department_id INT NULL,
  position_id INT NULL,
  manager_id INT NULL,
  hire_date DATE NULL,
  probation_end_date DATE NULL,
  employment_type ENUM('full_time','contract','daily') DEFAULT 'full_time',
  status ENUM('active','probation','resigned','terminated') DEFAULT 'active',
  avatar_url VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(255) NULL,
  birth_date DATE NULL,
  gender VARCHAR(20) NULL,
  emergency_name VARCHAR(255) NULL,
  emergency_phone VARCHAR(30) NULL,
  emergency_relation VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_user_id (user_id),
  KEY idx_employees_company (company_id),
  KEY idx_employees_department (department_id),
  KEY idx_employees_position (position_id),
  KEY idx_employees_manager (manager_id),
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_company FOREIGN KEY (company_id) REFERENCES companies(id),
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_position FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  company_id INT NULL,
  department_id INT NULL,
  PRIMARY KEY (id),
  KEY idx_user_roles_user (user_id),
  KEY idx_user_roles_role (role_id),
  KEY idx_user_roles_company (company_id),
  KEY idx_user_roles_department (department_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employee_attachments (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NULL,
  file_size BIGINT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_employee_attachments_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE employee_history_logs (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id INT NOT NULL,
  changed_at DATE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_employee_history_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Attendance / schedule
CREATE TABLE work_schedules (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  shift_name VARCHAR(100) NOT NULL,
  time_in TIME NOT NULL,
  time_out TIME NOT NULL,
  grace_period_mins INT DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_work_schedules_company (company_id),
  CONSTRAINT fk_work_schedules_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attendances (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id INT NOT NULL,
  work_date DATE NOT NULL,
  check_in_time DATETIME NULL,
  check_out_time DATETIME NULL,
  check_in_location VARCHAR(255) NULL,
  check_out_location VARCHAR(255) NULL,
  status ENUM('present','late','absent','leave','holiday') DEFAULT 'present',
  is_manual_edit TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_attendances_employee (employee_id),
  CONSTRAINT fk_attendances_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) Leave module
CREATE TABLE leave_types (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  leave_type_code VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  default_quota DECIMAL(5,2) DEFAULT 0,
  is_paid_leave TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_leave_type_company_code (company_id, leave_type_code),
  KEY idx_leave_types_company (company_id),
  CONSTRAINT fk_leave_types_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE leave_policy_configs (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  service_years DECIMAL(6,2) NOT NULL DEFAULT 1,
  vacation_days DECIMAL(6,2) NOT NULL DEFAULT 6,
  sick_cert_required_after_days INT NOT NULL DEFAULT 2,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_leave_policy_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE leave_requests (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,2) NOT NULL,
  reason TEXT NULL,
  document_url VARCHAR(255) NULL,
  approver_id INT NULL,
  status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leave_requests_employee (employee_id),
  KEY idx_leave_requests_type (leave_type_id),
  KEY idx_leave_requests_approver (approver_id),
  CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_requests_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_requests_approver FOREIGN KEY (approver_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE leave_balances (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  year INT NOT NULL,
  quota DECIMAL(5,2) DEFAULT 0,
  used DECIMAL(5,2) DEFAULT 0,
  pending DECIMAL(5,2) DEFAULT 0,
  balance DECIMAL(5,2) DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_leave_balance_employee_type_year (employee_id, leave_type_id, year),
  KEY idx_leave_balances_leave_type (leave_type_id),
  CONSTRAINT fk_leave_balances_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_balances_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6) OT + approval
CREATE TABLE ot_requests (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id INT NOT NULL,
  request_date DATE NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  total_hours DECIMAL(5,2) NOT NULL,
  reason TEXT NULL,
  approver_id INT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ot_requests_employee (employee_id),
  KEY idx_ot_requests_approver (approver_id),
  CONSTRAINT fk_ot_requests_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_ot_requests_approver FOREIGN KEY (approver_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE approvals (
  id INT NOT NULL AUTO_INCREMENT,
  requested_by INT NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  approved_by INT NULL,
  approved_date DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approval_type VARCHAR(50) NULL,
  request_reason TEXT NULL,
  requested_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_approvals_requested_by (requested_by),
  KEY idx_approvals_approved_by (approved_by),
  CONSTRAINT fk_approvals_requested_by FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_approvals_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7) Contracts + holidays
CREATE TABLE employee_contracts (
  id INT NOT NULL AUTO_INCREMENT,
  employee_id INT NOT NULL,
  company_id INT NOT NULL,
  contract_type ENUM('probation','permanent','temporary') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  document_url VARCHAR(255) NULL,
  status ENUM('active','expired','terminated') DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_employee_contracts_employee (employee_id),
  KEY idx_employee_contracts_company (company_id),
  CONSTRAINT fk_employee_contracts_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_contracts_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contract_templates (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  html_content LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contract_templates_company (company_id),
  CONSTRAINT fk_contract_templates_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE holidays (
  id INT NOT NULL AUTO_INCREMENT,
  company_id INT NULL,
  date DATE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_holidays_company (company_id),
  CONSTRAINT fk_holidays_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE public_holidays (
  id INT NOT NULL AUTO_INCREMENT,
  holiday_date DATE NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_id INT NULL,
  PRIMARY KEY (id),
  KEY idx_public_holidays_company (company_id),
  CONSTRAINT fk_public_holidays_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8) Admin/config tables
CREATE TABLE approval_flow_configs (
  id INT NOT NULL AUTO_INCREMENT,
  module_key VARCHAR(50) NOT NULL,
  level1 VARCHAR(100) NOT NULL,
  level2 VARCHAR(100) NOT NULL,
  level3 VARCHAR(100) NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_module_key (module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_settings (
  setting_key VARCHAR(100) NOT NULL,
  setting_value_json JSON NOT NULL,
  updated_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payroll_employee_settings (
  employee_id INT NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  bank_name VARCHAR(50) NOT NULL DEFAULT 'SCB',
  bank_account_no VARCHAR(50) NOT NULL DEFAULT '',
  tax_dependent INT NOT NULL DEFAULT 0,
  life_insurance_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  sso_enabled TINYINT(1) NOT NULL DEFAULT 1,
  updated_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_permission_matrix (
  id INT NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(100) NOT NULL,
  module_key VARCHAR(100) NOT NULL,
  can_view TINYINT(1) NOT NULL DEFAULT 0,
  can_create TINYINT(1) NOT NULL DEFAULT 0,
  can_edit TINYINT(1) NOT NULL DEFAULT 0,
  can_delete TINYINT(1) NOT NULL DEFAULT 0,
  updated_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_role_module (role_name, module_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id INT NULL,
  username VARCHAR(255) NULL,
  action VARCHAR(100) NOT NULL,
  target VARCHAR(255) NULL,
  ip_address VARCHAR(64) NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_action (action),
  KEY idx_created_at (created_at),
  KEY idx_username (username),
  KEY idx_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- MOCK DATA
-- =========================================================

INSERT INTO roles (id, role_name, role_level, description) VALUES
(1, 'Employee', 1, 'พนักงานทั่วไป'),
(2, 'Manager', 20, 'หัวหน้างาน'),
(3, 'HR Company', 50, 'HR ระดับบริษัท'),
(4, 'Central HR', 80, 'HR ส่วนกลาง'),
(5, 'Super Admin', 99, 'ผู้ดูแลระบบสูงสุด');

INSERT INTO companies (id, code, name_th, name_en, tax_id) VALUES
(1, 'TECH', 'Tech Company', 'Tech Company', '0105551000001'),
(2, 'SALES', 'Sales Company', 'Sales Company', '0105551000002');

INSERT INTO departments (id, company_id, code, name_th, parent_dept_id, cost_center) VALUES
(1, 1, 'IT', 'IT', NULL, 'CC-IT'),
(2, 1, 'HR', 'HR', NULL, 'CC-HR'),
(3, 2, 'SALE', 'Sales', NULL, 'CC-SALE'),
(4, 2, 'ACC', 'Accounting', NULL, 'CC-ACC'),
(5, 1, 'ENG', 'Engineering', 1, 'CC-ENG');

INSERT INTO positions (id, company_id, title_th, level) VALUES
(1, 1, 'CEO', 10),
(2, 1, 'HR Manager', 7),
(3, 1, 'IT Manager', 7),
(4, 1, 'Software Engineer', 4),
(5, 2, 'Sales Manager', 6),
(6, 2, 'Accounting Manager', 6),
(7, 2, 'Accountant', 3);

-- plain-text passwords for demo only (backend supports plain text fallback)
INSERT INTO users (id, username, password_hash, status) VALUES
(1, 'admin_central', '1234', 'active'),
(2, 'hr_tech', '1234', 'active'),
(3, 'manager_it', '1234', 'active'),
(4, 'emp_somchai', '1234', 'active'),
(5, 'Employee', '1234', 'active'),
(6, 'Super_Admin', '1234', 'active'),
(7, 'emp_nongmai', '1234', 'active'),
(8, 'manager_acc', '1234', 'active'),
(9, 'emp_acc', '1234', 'active'),
(10, 'emp_resign', '1234', 'active');

INSERT INTO employees (
  id, user_id, employee_code, firstname_th, lastname_th, nickname, id_card_number,
  company_id, department_id, position_id, manager_id,
  hire_date, probation_end_date, employment_type, status,
  phone, email, birth_date, gender, emergency_name, emergency_phone, emergency_relation
) VALUES
(1, 1, 'E0001', 'สมศักดิ์', 'บริหารดี', 'Boss', '1100000000001', 1, 2, 1, NULL, '2020-01-01', '2020-04-01', 'full_time', 'active', '0810000001', 'admin@tech.local', '1985-01-01', 'male', 'คุณเอ', '0811111111', 'spouse'),
(2, 2, 'E0002', 'ใจดี', 'รักพนักงาน', 'Joy', '1100000000002', 1, 2, 2, 1, '2021-02-01', '2021-05-01', 'full_time', 'active', '0810000002', 'hr@tech.local', '1990-02-02', 'female', 'คุณบี', '0821111111', 'sibling'),
(3, 3, 'E0003', 'จารุวรรณ', 'แก้บั๊ก', 'Jaru', '1100000000003', 1, 1, 3, 1, '2021-03-01', '2021-06-01', 'full_time', 'active', '0810000003', 'manager.it@tech.local', '1992-03-03', 'female', 'คุณซี', '0831111111', 'parent'),
(4, 4, 'E0004', 'สมชาย', 'โค้ดเก่ง', 'Somchai', '1100000000004', 1, 5, 4, 3, '2023-01-15', '2023-04-15', 'full_time', 'active', '0810000004', 'somchai@tech.local', '1998-04-04', 'male', 'คุณดี', '0841111111', 'parent'),
(5, 5, 'E0005', 'วิชัย', 'ขายเก่ง', 'Wichai', '1100000000005', 2, 3, 5, 6, '2022-04-01', '2022-07-01', 'full_time', 'active', '0810000005', 'wichai@sales.local', '1993-05-05', 'male', 'คุณอี', '0851111111', 'spouse'),
(6, 6, 'E0006', 'สมหญิง', 'ยอดเยี่ยม', 'Somying', '1100000000006', 2, 3, 5, 1, '2021-06-01', '2021-09-01', 'full_time', 'active', '0810000006', 'somying@sales.local', '1991-06-06', 'female', 'คุณเอฟ', '0861111111', 'parent'),
(7, 7, 'E0007', 'น้องใหม่', 'ไฟแรง', 'Mai', '1100000000007', 2, 3, 5, 6, '2024-01-10', '2024-04-10', 'full_time', 'active', '0810000007', 'mai@sales.local', '2000-07-07', 'female', 'คุณจี', '0871111111', 'parent'),
(8, 8, 'E0008', 'ธนพล', 'นับเงิน', 'Tan', '1100000000008', 2, 4, 6, 6, '2022-08-01', '2022-11-01', 'full_time', 'active', '0810000008', 'tan@sales.local', '1994-08-08', 'male', 'คุณเอช', '0881111111', 'sibling'),
(9, 9, 'E0009', 'วิชุดา', 'ระเบียบจัด', 'Wichuda', '1100000000009', 2, 4, 7, 8, '2023-02-01', '2023-05-01', 'full_time', 'active', '0810000009', 'wichuda@sales.local', '1997-09-09', 'female', 'คุณไอ', '0891111111', 'parent'),
(10, 10, 'E0010', 'มานะ', 'อดทน', 'Mana', '1100000000010', 1, 5, 4, 3, '2022-01-01', '2022-04-01', 'contract', 'resigned', '0810000010', 'mana@tech.local', '1996-10-10', 'male', 'คุณเจ', '0801111111', 'spouse');

INSERT INTO user_roles (id, user_id, role_id, company_id, department_id) VALUES
(1, 1, 5, 1, 2),
(2, 2, 3, 1, 2),
(3, 3, 2, 1, 1),
(4, 4, 1, 1, 5),
(5, 5, 1, 2, 3),
(6, 6, 5, 2, 3),
(7, 7, 1, 2, 3),
(8, 8, 2, 2, 4),
(9, 9, 1, 2, 4),
(10, 10, 1, 1, 5);

INSERT INTO work_schedules (id, company_id, shift_name, time_in, time_out, grace_period_mins) VALUES
(1, 1, 'Day Shift', '09:00:00', '18:00:00', 15),
(2, 2, 'Office Shift', '08:30:00', '17:30:00', 10);

INSERT INTO leave_types (id, company_id, leave_type_code, name, default_quota, is_paid_leave) VALUES
(1, 1, 'annual', 'Annual Leave', 10, 1),
(2, 1, 'sick', 'Sick Leave', 30, 1),
(3, 1, 'personal', 'Personal Leave', 5, 0),
(4, 1, 'maternity', 'Maternity Leave', 98, 1),
(5, 2, 'annual', 'Annual Leave', 10, 1),
(6, 2, 'sick', 'Sick Leave', 30, 1),
(7, 2, 'personal', 'Personal Leave', 5, 0),
(8, 2, 'maternity', 'Maternity Leave', 98, 1);

INSERT INTO leave_policy_configs (id, company_id, service_years, vacation_days, sick_cert_required_after_days, is_active) VALUES
(1, 1, 1, 10, 2, 1),
(2, 2, 1, 10, 2, 1);

INSERT INTO leave_balances (employee_id, leave_type_id, year, quota, used, pending, balance)
SELECT e.id, lt.id, YEAR(CURDATE()), lt.default_quota, 0, 0, lt.default_quota
FROM employees e
JOIN leave_types lt ON lt.company_id = e.company_id;

INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, total_days, reason, approver_id, status) VALUES
(4, 1, CONCAT(YEAR(CURDATE()), '-03-12'), CONCAT(YEAR(CURDATE()), '-03-12'), 1, 'Annual leave for personal errands', 3, 'approved'),
(4, 2, CONCAT(YEAR(CURDATE()), '-03-24'), CONCAT(YEAR(CURDATE()), '-03-24'), 1, 'Medical appointment', 3, 'pending'),
(5, 5, CONCAT(YEAR(CURDATE()), '-03-14'), CONCAT(YEAR(CURDATE()), '-03-14'), 1, 'Family event', 6, 'approved');

UPDATE leave_balances lb
LEFT JOIN (
  SELECT employee_id, leave_type_id, YEAR(start_date) AS req_year,
         SUM(CASE WHEN status='approved' THEN total_days ELSE 0 END) AS used_days,
         SUM(CASE WHEN status='pending' THEN total_days ELSE 0 END) AS pending_days
  FROM leave_requests
  GROUP BY employee_id, leave_type_id, YEAR(start_date)
) req ON req.employee_id = lb.employee_id
    AND req.leave_type_id = lb.leave_type_id
    AND req.req_year = lb.year
SET lb.used = COALESCE(req.used_days, 0),
    lb.pending = COALESCE(req.pending_days, 0),
    lb.balance = GREATEST(lb.quota - COALESCE(req.used_days, 0) - COALESCE(req.pending_days, 0), 0);

INSERT INTO attendances (employee_id, work_date, check_in_time, check_out_time, status, is_manual_edit) VALUES
(4, CONCAT(YEAR(CURDATE()), '-03-03'), CONCAT(YEAR(CURDATE()), '-03-03 08:58:00'), CONCAT(YEAR(CURDATE()), '-03-03 17:35:00'), 'present', 0),
(4, CONCAT(YEAR(CURDATE()), '-03-04'), CONCAT(YEAR(CURDATE()), '-03-04 09:17:00'), CONCAT(YEAR(CURDATE()), '-03-04 18:02:00'), 'late', 0),
(4, CONCAT(YEAR(CURDATE()), '-03-05'), CONCAT(YEAR(CURDATE()), '-03-05 08:55:00'), CONCAT(YEAR(CURDATE()), '-03-05 17:42:00'), 'present', 0),
(5, CONCAT(YEAR(CURDATE()), '-03-03'), CONCAT(YEAR(CURDATE()), '-03-03 08:45:00'), CONCAT(YEAR(CURDATE()), '-03-03 17:40:00'), 'present', 0),
(6, CONCAT(YEAR(CURDATE()), '-03-03'), CONCAT(YEAR(CURDATE()), '-03-03 08:36:00'), CONCAT(YEAR(CURDATE()), '-03-03 17:34:00'), 'present', 0);

INSERT INTO ot_requests (employee_id, request_date, start_time, end_time, total_hours, reason, approver_id, status) VALUES
(4, CONCAT(YEAR(CURDATE()), '-03-11'), CONCAT(YEAR(CURDATE()), '-03-11 18:00:00'), CONCAT(YEAR(CURDATE()), '-03-11 20:00:00'), 2.00, 'Support production release', 3, 'approved'),
(4, CONCAT(YEAR(CURDATE()), '-03-20'), CONCAT(YEAR(CURDATE()), '-03-20 18:30:00'), CONCAT(YEAR(CURDATE()), '-03-20 20:00:00'), 1.50, 'Client urgent request', 3, 'pending'),
(5, CONCAT(YEAR(CURDATE()), '-03-13'), CONCAT(YEAR(CURDATE()), '-03-13 18:00:00'), CONCAT(YEAR(CURDATE()), '-03-13 19:30:00'), 1.50, 'Month-end closure', 6, 'approved');

INSERT INTO approvals (approval_type, request_reason, requested_by, status, approved_by, requested_date, approved_date) VALUES
('leave', 'Leave request pending approval', 4, 'pending', NULL, CONCAT(YEAR(CURDATE()), '-03-10 09:00:00'), NULL),
('ot', 'OT request waiting for manager', 4, 'pending', NULL, CONCAT(YEAR(CURDATE()), '-03-15 09:00:00'), NULL),
('leave', 'Leave request approved', 5, 'approved', 6, CONCAT(YEAR(CURDATE()), '-03-05 09:00:00'), CONCAT(YEAR(CURDATE()), '-03-05 11:30:00'));

INSERT INTO employee_contracts (employee_id, company_id, contract_type, start_date, end_date, status) VALUES
(4, 1, 'permanent', '2024-01-01', '2026-12-31', 'active'),
(5, 2, 'temporary', '2025-01-01', '2026-06-30', 'active'),
(10, 1, 'temporary', '2022-01-01', '2023-01-01', 'expired');

INSERT INTO contract_templates (company_id, name, html_content) VALUES
(1, 'Standard Employment Contract', 'Employment agreement between {{company_name}} and {{employee_name}} as {{position}} with salary {{salary}}.'),
(1, 'Probation Contract', '{{employee_name}} starts probation role {{position}} at {{company_name}} from {{start_date}} to {{end_date}}.'),
(2, 'Standard Employment Contract', 'Employment agreement between {{company_name}} and {{employee_name}} as {{position}} with salary {{salary}}.'),
(2, 'Probation Contract', '{{employee_name}} starts probation role {{position}} at {{company_name}} from {{start_date}} to {{end_date}}.');

INSERT INTO public_holidays (holiday_date, name, company_id) VALUES
(CONCAT(YEAR(CURDATE()), '-04-06'), 'Chakri Memorial Day', NULL),
(CONCAT(YEAR(CURDATE()), '-04-13'), 'Songkran Festival Day 1', NULL),
(CONCAT(YEAR(CURDATE()), '-05-01'), 'National Labour Day', NULL);

INSERT INTO holidays (company_id, date, name) VALUES
(1, CONCAT(YEAR(CURDATE()), '-12-30'), 'Tech Company Year-End Holiday'),
(2, CONCAT(YEAR(CURDATE()), '-12-31'), 'Sales Company Year-End Holiday');

INSERT INTO approval_flow_configs (module_key, level1, level2, level3, updated_by) VALUES
('leave', 'Manager', 'HR Company', 'Central HR', 1),
('ot', 'Manager', 'HR Company', 'Central HR', 1),
('payroll', 'HR Company', 'Central HR', '-', 1);

INSERT INTO system_settings (setting_key, setting_value_json, updated_by) VALUES
('groupName', JSON_OBJECT('value', 'HR Group Holding'), 1),
('defaultTimezone', JSON_OBJECT('value', 'Asia/Bangkok'), 1);

INSERT INTO payroll_employee_settings (employee_id, basic_salary, bank_name, bank_account_no, tax_dependent, life_insurance_deduction, sso_enabled)
SELECT id, 30000, 'SCB', CONCAT('000', LPAD(id, 7, '0')), 0, 0, 1
FROM employees;

INSERT INTO role_permission_matrix (role_name, module_key, can_view, can_create, can_edit, can_delete, updated_by) VALUES
('Super Admin', 'employees', 1, 1, 1, 1, 1),
('Super Admin', 'leave', 1, 1, 1, 1, 1),
('Central HR', 'employees', 1, 1, 1, 0, 1),
('HR Company', 'employees', 1, 1, 1, 0, 2),
('Manager', 'leave', 1, 0, 1, 0, 3),
('Employee', 'selfService', 1, 1, 0, 0, 4);

INSERT INTO employee_attachments (employee_id, file_name, file_type, file_size) VALUES
(4, 'employment-contract.pdf', 'application/pdf', 128000),
(5, 'id-card.png', 'image/png', 512000);

INSERT INTO employee_history_logs (employee_id, changed_at, event_type, old_value, new_value, note) VALUES
(4, CURDATE(), 'promote', 'Junior Developer', 'Software Engineer', 'Promotion after annual review'),
(5, CURDATE(), 'transfer_department', 'Inside Sales', 'Field Sales', 'Business restructuring');

INSERT INTO audit_logs (user_id, username, action, target, ip_address, metadata_json) VALUES
(1, 'admin_central', 'SEED', 'mock_backend_full.sql', '127.0.0.1', JSON_OBJECT('env', 'local', 'version', '1.0')),
(2, 'hr_tech', 'LOGIN', 'System', '127.0.0.1', JSON_OBJECT('note', 'mock login'));

-- helpful summary checks
SELECT 'users' AS table_name, COUNT(*) AS total FROM users
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'leave_balances', COUNT(*) FROM leave_balances
UNION ALL SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL SELECT 'attendances', COUNT(*) FROM attendances
UNION ALL SELECT 'ot_requests', COUNT(*) FROM ot_requests
UNION ALL SELECT 'approvals', COUNT(*) FROM approvals;
