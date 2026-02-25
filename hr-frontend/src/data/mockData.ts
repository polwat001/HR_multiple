export interface Company {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  companyId: string;
  email: string;
  phone: string;
  hireDate: string;
  status: "active" | "inactive" | "probation";
  avatar: string;
  contractEnd?: string;
  history: TransferRecord[];
}

export interface TransferRecord {
  date: string;
  fromCompany: string;
  toCompany: string;
  fromPosition: string;
  toPosition: string;
  type: "hire" | "transfer" | "promote";
}

export interface AttendanceRecord {
  date: string;
  employeeId: string;
  timeIn: string;
  timeOut: string;
  status: "present" | "late" | "absent" | "leave";
}

export interface LeaveQuota {
  type: string;
  total: number;
  used: number;
}

export interface OTRecord {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  amount: number;
  status: "pending" | "approved" | "rejected";
}

export const companies: Company[] = [
  { id: "all", name: "All Companies", shortName: "ALL", logo: "🏢", color: "hsl(215 70% 45%)" },
  { id: "company-a", name: "ABC Holdings Co., Ltd.", shortName: "ABC", logo: "🔵", color: "hsl(215 70% 45%)" },
  { id: "company-b", name: "XYZ Services Co., Ltd.", shortName: "XYZ", logo: "🟢", color: "hsl(175 60% 40%)" },
  { id: "company-c", name: "DEF Manufacturing Co., Ltd.", shortName: "DEF", logo: "🟠", color: "hsl(38 92% 50%)" },
];

export const employees: Employee[] = [
  {
    id: "emp-001", employeeCode: "A-0001", firstName: "สมชาย", lastName: "วงศ์สวัสดิ์",
    position: "HR Director", department: "Human Resources", companyId: "company-a",
    email: "somchai@abc.co.th", phone: "081-234-5678", hireDate: "2020-03-15",
    status: "active", avatar: "👨‍💼", contractEnd: "2026-06-30",
    history: [
      { date: "2020-03-15", fromCompany: "", toCompany: "company-a", fromPosition: "", toPosition: "HR Manager", type: "hire" },
      { date: "2023-01-01", fromCompany: "company-a", toCompany: "company-a", fromPosition: "HR Manager", toPosition: "HR Director", type: "promote" },
    ]
  },
  {
    id: "emp-002", employeeCode: "A-0002", firstName: "สมหญิง", lastName: "ใจดี",
    position: "Senior Developer", department: "IT", companyId: "company-a",
    email: "somying@abc.co.th", phone: "082-345-6789", hireDate: "2021-06-01",
    status: "active", avatar: "👩‍💻", contractEnd: "2026-03-15",
    history: [
      { date: "2021-06-01", fromCompany: "", toCompany: "company-a", fromPosition: "", toPosition: "Developer", type: "hire" },
      { date: "2023-07-01", fromCompany: "company-a", toCompany: "company-a", fromPosition: "Developer", toPosition: "Senior Developer", type: "promote" },
    ]
  },
  {
    id: "emp-003", employeeCode: "B-0001", firstName: "วิชัย", lastName: "พงษ์ทอง",
    position: "Accounting Manager", department: "Finance", companyId: "company-b",
    email: "wichai@xyz.co.th", phone: "083-456-7890", hireDate: "2019-01-10",
    status: "active", avatar: "👨‍💼", contractEnd: "2026-01-10",
    history: [
      { date: "2019-01-10", fromCompany: "", toCompany: "company-a", fromPosition: "", toPosition: "Accountant", type: "hire" },
      { date: "2022-04-01", fromCompany: "company-a", toCompany: "company-b", fromPosition: "Accountant", toPosition: "Accounting Manager", type: "transfer" },
    ]
  },
  {
    id: "emp-004", employeeCode: "B-0002", firstName: "นภา", lastName: "สุขสันต์",
    position: "HR Officer", department: "Human Resources", companyId: "company-b",
    email: "napa@xyz.co.th", phone: "084-567-8901", hireDate: "2022-08-15",
    status: "probation", avatar: "👩‍💼", contractEnd: "2026-03-01",
    history: [
      { date: "2022-08-15", fromCompany: "", toCompany: "company-b", fromPosition: "", toPosition: "HR Officer", type: "hire" },
    ]
  },
  {
    id: "emp-005", employeeCode: "A-0003", firstName: "ประสิทธิ์", lastName: "แก้วมณี",
    position: "IT Support", department: "IT", companyId: "company-a",
    email: "prasit@abc.co.th", phone: "085-678-9012", hireDate: "2023-02-01",
    status: "active", avatar: "👨‍🔧", contractEnd: "2026-02-28",
    history: [
      { date: "2023-02-01", fromCompany: "", toCompany: "company-a", fromPosition: "", toPosition: "IT Support", type: "hire" },
    ]
  },
  {
    id: "emp-006", employeeCode: "C-0001", firstName: "อรุณ", lastName: "ศรีสุข",
    position: "Production Manager", department: "Production", companyId: "company-c",
    email: "arun@def.co.th", phone: "086-789-0123", hireDate: "2018-05-20",
    status: "active", avatar: "👨‍🏭", contractEnd: "2026-05-20",
    history: [
      { date: "2018-05-20", fromCompany: "", toCompany: "company-c", fromPosition: "", toPosition: "Production Supervisor", type: "hire" },
      { date: "2021-01-01", fromCompany: "company-c", toCompany: "company-c", fromPosition: "Production Supervisor", toPosition: "Production Manager", type: "promote" },
    ]
  },
  {
    id: "emp-007", employeeCode: "C-0002", firstName: "พิมพ์", lastName: "ชัยวัฒน์",
    position: "QA Engineer", department: "Quality", companyId: "company-c",
    email: "pim@def.co.th", phone: "087-890-1234", hireDate: "2023-09-01",
    status: "active", avatar: "👩‍🔬", contractEnd: "2026-03-10",
    history: [
      { date: "2023-09-01", fromCompany: "", toCompany: "company-c", fromPosition: "", toPosition: "QA Engineer", type: "hire" },
    ]
  },
  {
    id: "emp-008", employeeCode: "A-0004", firstName: "ธนา", lastName: "รุ่งเรือง",
    position: "Marketing Manager", department: "Marketing", companyId: "company-a",
    email: "thana@abc.co.th", phone: "088-901-2345", hireDate: "2020-11-01",
    status: "active", avatar: "👨‍💼", contractEnd: "2026-04-15",
    history: [
      { date: "2020-11-01", fromCompany: "", toCompany: "company-a", fromPosition: "", toPosition: "Marketing Officer", type: "hire" },
      { date: "2023-11-01", fromCompany: "company-a", toCompany: "company-a", fromPosition: "Marketing Officer", toPosition: "Marketing Manager", type: "promote" },
    ]
  },
];

export const headcountByCompany = [
  { company: "ABC Holdings", count: 45, companyId: "company-a" },
  { company: "XYZ Services", count: 32, companyId: "company-b" },
  { company: "DEF Manufacturing", count: 28, companyId: "company-c" },
];

export const headcountByDepartment = {
  "company-a": [
    { department: "Human Resources", count: 8 },
    { department: "IT", count: 12 },
    { department: "Marketing", count: 10 },
    { department: "Finance", count: 8 },
    { department: "Operations", count: 7 },
  ],
  "company-b": [
    { department: "Human Resources", count: 5 },
    { department: "Finance", count: 10 },
    { department: "Sales", count: 12 },
    { department: "Operations", count: 5 },
  ],
  "company-c": [
    { department: "Production", count: 15 },
    { department: "Quality", count: 5 },
    { department: "Logistics", count: 5 },
    { department: "Admin", count: 3 },
  ],
};

export const attendanceData = [
  { name: "มาทำงาน", value: 78, color: "hsl(var(--success))" },
  { name: "สาย", value: 8, color: "hsl(var(--warning))" },
  { name: "ขาด", value: 4, color: "hsl(var(--destructive))" },
  { name: "ลา", value: 15, color: "hsl(var(--info))" },
];

export const otCostData = [
  { month: "ก.ย.", amount: 185000 },
  { month: "ต.ค.", amount: 210000 },
  { month: "พ.ย.", amount: 195000 },
  { month: "ธ.ค.", amount: 245000 },
  { month: "ม.ค.", amount: 220000 },
  { month: "ก.พ.", amount: 198000 },
];

export const contractExpiring = [
  { employeeId: "emp-005", name: "ประสิทธิ์ แก้วมณี", company: "ABC Holdings", expireDate: "2026-02-28", daysLeft: 5 },
  { employeeId: "emp-004", name: "นภา สุขสันต์", company: "XYZ Services", expireDate: "2026-03-01", daysLeft: 6 },
  { employeeId: "emp-007", name: "พิมพ์ ชัยวัฒน์", company: "DEF Manufacturing", expireDate: "2026-03-10", daysLeft: 15 },
  { employeeId: "emp-002", name: "สมหญิง ใจดี", company: "ABC Holdings", expireDate: "2026-03-15", daysLeft: 20 },
];

export const orgStructure = {
  id: "group",
  name: "HR Group (Holding)",
  type: "group" as const,
  children: [
    {
      id: "company-a",
      name: "ABC Holdings Co., Ltd.",
      type: "company" as const,
      children: [
        {
          id: "branch-a1", name: "สำนักงานใหญ่", type: "branch" as const,
          children: [
            { id: "dept-hr-a", name: "Human Resources", type: "department" as const, costCenter: "CC-A-HR01", children: [] },
            { id: "dept-it-a", name: "IT", type: "department" as const, costCenter: "CC-A-IT01", children: [] },
            { id: "dept-mkt-a", name: "Marketing", type: "department" as const, costCenter: "CC-A-MK01", children: [] },
          ]
        }
      ]
    },
    {
      id: "company-b",
      name: "XYZ Services Co., Ltd.",
      type: "company" as const,
      children: [
        {
          id: "branch-b1", name: "สาขากรุงเทพ", type: "branch" as const,
          children: [
            { id: "dept-hr-b", name: "Human Resources", type: "department" as const, costCenter: "CC-B-HR01", children: [] },
            { id: "dept-fin-b", name: "Finance", type: "department" as const, costCenter: "CC-B-FN01", children: [] },
          ]
        }
      ]
    },
    {
      id: "company-c",
      name: "DEF Manufacturing Co., Ltd.",
      type: "company" as const,
      children: [
        {
          id: "branch-c1", name: "โรงงาน 1", type: "branch" as const,
          children: [
            { id: "dept-prod-c", name: "Production", type: "department" as const, costCenter: "CC-C-PD01", children: [] },
            { id: "dept-qa-c", name: "Quality", type: "department" as const, costCenter: "CC-C-QA01", children: [] },
          ]
        }
      ]
    }
  ]
};
