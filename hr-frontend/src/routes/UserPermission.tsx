import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Users, ClipboardList, UserCog } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";

const rolesCatalog = [
  {
    id: 1, name: "Super Admin", description: "Full access to all modules and companies",
  },
  {
    id: 2, name: "Central HR", description: "Manage cross-company HR governance",
  },
  {
    id: 3, name: "HR Company", description: "Manage HR operations in assigned company",
  },
  {
    id: 4, name: "Manager", description: "Approve team requests, view team data",
  },
  {
    id: 5, name: "Employee", description: "View own data, submit leave/OT",
  },
];

const initialUsers = [
  {
    id: 1,
    username: "admin_central",
    email: "admin.central@hrgroup.local",
    displayName: "สมชาย วงศ์สวัสดิ์",
    lastLogin: "2026-03-10 09:12",
    status: "active",
  },
  {
    id: 2,
    username: "hr_company_abc",
    email: "hr.abc@hrgroup.local",
    displayName: "นภา สุขสันต์",
    lastLogin: "2026-03-10 08:40",
    status: "active",
  },
  {
    id: 3,
    username: "mgr_acc_abc",
    email: "manager.acc@hrgroup.local",
    displayName: "วิชัย พงษ์ทอง",
    lastLogin: "2026-03-09 18:10",
    status: "locked",
  },
];

const initialAssignments = [
  { userId: 1, role: "Super Admin", companyScope: "All Companies", departmentScope: "All Departments" },
  { userId: 2, role: "HR Manager", companyScope: "ABC", departmentScope: "All Departments" },
  { userId: 3, role: "Line Manager", companyScope: "ABC", departmentScope: "Accounting" },
];

const modules = [
  "dashboard",
  "organization",
  "employee",
  "attendance",
  "leave",
  "contract",
  "reports",
  "permissions",
  "holidays",
  "audit_log",
];

const initialPermissionMatrix = modules.reduce((acc, moduleName) => {
  acc[moduleName] = {
    view: true,
    create: moduleName !== "dashboard" && moduleName !== "reports" && moduleName !== "audit_log",
    edit: moduleName !== "dashboard" && moduleName !== "reports",
    delete: ["employee", "contract", "permissions"].includes(moduleName),
  };
  return acc;
}, {} as Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>);

const transactionLogs = [
  {
    id: 1,
    user: "admin_central",
    action: "UPDATE_EMPLOYEE",
    target: "EMP-00023 (นภา สุขสันต์)",
    when: "2026-03-10 10:14",
  },
  {
    id: 2,
    user: "hr_company_abc",
    action: "ASSIGN_ROLE",
    target: "user mgr_acc_abc -> Line Manager",
    when: "2026-03-10 09:50",
  },
  {
    id: 3,
    user: "admin_central",
    action: "LOCK_ACCOUNT",
    target: "user mgr_acc_abc",
    when: "2026-03-09 18:12",
  },
];

const UserPermissions = () => {
  const [selectedRole, setSelectedRole] = useState(0);
  const [users, setUsers] = useState(initialUsers);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [matrix, setMatrix] = useState(initialPermissionMatrix);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixSaving, setMatrixSaving] = useState(false);
  const [matrixMessage, setMatrixMessage] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    userId: String(initialUsers[0].id),
    role: rolesCatalog[0].name,
    companyScope: "All Companies",
    departmentScope: "All Departments",
  });

  const userMap = useMemo(() => {
    const map = new Map<number, { username: string; displayName: string }>();
    users.forEach((u) => map.set(u.id, { username: u.username, displayName: u.displayName }));
    return map;
  }, [users]);

  const selectedRoleName = rolesCatalog[selectedRole]?.name;

  useEffect(() => {
    const fetchMatrix = async () => {
      if (!selectedRoleName) return;
      try {
        setMatrixLoading(true);
        setMatrixMessage(null);
        const res = await apiGet<any>(`/admin/permission-matrix?role=${encodeURIComponent(selectedRoleName)}`);
        setMatrix(res?.data || initialPermissionMatrix);
      } catch (error) {
        console.error("Failed to load permission matrix:", error);
        setMatrix(initialPermissionMatrix);
        setMatrixMessage("โหลด Permission Matrix ไม่สำเร็จ กำลังใช้ค่าเริ่มต้น");
      } finally {
        setMatrixLoading(false);
      }
    };

    fetchMatrix();
  }, [selectedRoleName]);

  const toggleUserStatus = (id: number) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: u.status === "active" ? "locked" : "active" } : u)));
  };

  const handlePermissionToggle = (
    moduleName: string,
    key: "view" | "create" | "edit" | "delete",
  ) => {
    setMatrix((prev) => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        [key]: !prev[moduleName][key],
      },
    }));
  };

  const handleAddAssignment = () => {
    setAssignments((prev) => [
      {
        userId: Number(newAssignment.userId),
        role: newAssignment.role,
        companyScope: newAssignment.companyScope,
        departmentScope: newAssignment.departmentScope,
      },
      ...prev,
    ]);
  };

  const handleSaveMatrix = async () => {
    if (!selectedRoleName) return;
    try {
      setMatrixSaving(true);
      await apiPut(`/admin/permission-matrix/${encodeURIComponent(selectedRoleName)}`, { matrix });
      setMatrixMessage(`บันทึก Permission Matrix ของ role ${selectedRoleName} สำเร็จ`);
    } catch (error: any) {
      console.error("Failed to save permission matrix:", error);
      const msg = error instanceof Error ? error.message : "บันทึก Permission Matrix ไม่สำเร็จ";
      setMatrixMessage(msg);
    } finally {
      setMatrixSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">User Accounts</TabsTrigger>
          <TabsTrigger value="assignments">Role Assignment</TabsTrigger>
          <TabsTrigger value="roles">Permission Matrix</TabsTrigger>
          <TabsTrigger value="logs">Transaction Log</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> User Accounts</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Add User</Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email / Username</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">ชื่อผู้ใช้งาน</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Login</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                </tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium">{u.email}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </td>
                      <td className="px-4 py-3">{u.displayName}</td>
                      <td className="px-4 py-3 text-xs font-mono">{u.lastLogin}</td>
                      <td className="px-4 py-3">
                        <Badge variant={u.status === "active" ? "secondary" : "destructive"} className="uppercase text-xs">
                          {u.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => toggleUserStatus(u.id)}>
                          {u.status === "active" ? "Lock" : "Unlock"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role List */}
            <div className="space-y-2">
              {rolesCatalog.map((r, i) => (
                <Card
                  key={r.id}
                  className={`shadow-card cursor-pointer transition-all ${i === selectedRole ? "ring-2 ring-primary" : "hover:shadow-card-hover"}`}
                  onClick={() => setSelectedRole(i)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{r.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" className="w-full gap-1.5 mt-2"><Plus className="h-4 w-4" /> New Role</Button>
            </div>

            {/* Permission Matrix */}
            <Card className="shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Permission Matrix — {rolesCatalog[selectedRole].name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matrixMessage ? <p className="text-xs mb-3 text-muted-foreground">{matrixMessage}</p> : null}
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Module</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">View</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Create</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Edit</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Delete</th>
                  </tr></thead>
                  <tbody>
                    {modules.map((m) => {
                      const row = matrix[m];
                      if (!row) return null;
                      return (
                        <tr key={m} className="border-b last:border-b-0">
                          <td className="px-4 py-2.5 capitalize font-medium">{m.replaceAll("_", " ")}</td>
                          <td className="text-center px-4 py-2.5"><Checkbox checked={row.view} onCheckedChange={() => handlePermissionToggle(m, "view")} /></td>
                          <td className="text-center px-4 py-2.5"><Checkbox checked={row.create} onCheckedChange={() => handlePermissionToggle(m, "create")} /></td>
                          <td className="text-center px-4 py-2.5"><Checkbox checked={row.edit} onCheckedChange={() => handlePermissionToggle(m, "edit")} /></td>
                          <td className="text-center px-4 py-2.5"><Checkbox checked={row.delete} onCheckedChange={() => handlePermissionToggle(m, "delete")} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 flex justify-end">
                  <Button size="sm" onClick={handleSaveMatrix} disabled={matrixSaving || matrixLoading}>
                    {matrixLoading ? "Loading..." : matrixSaving ? "Saving..." : "Save Permission Matrix"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="shadow-card lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><UserCog className="h-4 w-4" /> Assign Role</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">User</p>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newAssignment.userId}
                    onChange={(e) => setNewAssignment((prev) => ({ ...prev, userId: e.target.value }))}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.displayName} (@{u.username})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newAssignment.role}
                    onChange={(e) => setNewAssignment((prev) => ({ ...prev, role: e.target.value }))}
                  >
                    {rolesCatalog.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Company Scope</p>
                  <Input value={newAssignment.companyScope} onChange={(e) => setNewAssignment((prev) => ({ ...prev, companyScope: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Department Scope</p>
                  <Input value={newAssignment.departmentScope} onChange={(e) => setNewAssignment((prev) => ({ ...prev, departmentScope: e.target.value }))} />
                </div>
                <Button size="sm" className="w-full" onClick={handleAddAssignment}>Add Assignment</Button>
              </CardContent>
            </Card>

            <Card className="shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Role Assignment Table</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company Scope</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department Scope</th>
                  </tr></thead>
                  <tbody>
                    {assignments.map((a, idx) => {
                      const userInfo = userMap.get(a.userId);
                      return (
                        <tr key={`${a.userId}-${a.role}-${idx}`} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3">{userInfo?.displayName || "Unknown"}</td>
                          <td className="px-4 py-3"><Badge variant="default" className="text-xs">{a.role}</Badge></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{a.companyScope}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{a.departmentScope}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Transaction Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Target</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">DateTime</th>
                </tr></thead>
                <tbody>
                  {transactionLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3">{log.user}</td>
                      <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{log.action}</Badge></td>
                      <td className="px-4 py-3 text-xs">{log.target}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserPermissions;
