import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Shield, Plus, Users, ClipboardList, UserCog } from "lucide-react";
import { apiDelete, apiDeleteWithBody, apiGet, apiPost, apiPut } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

type UserRow = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  lastLogin: string;
  status: string;
  roles: string;
  companies: string;
};

type AuditLogRow = {
  id: number;
  user: string;
  action: string;
  target: string;
  when: string;
};

type RoleCatalogRow = {
  id: number;
  name: string;
  roleLevel?: number;
  description?: string;
};

const fallbackRolesCatalog: RoleCatalogRow[] = [
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

const modules = [
  "dashboard",
  "organization",
  "employee",
  "attendance",
  "leave",
  "contract",
  "reports",
  "payroll",
  "approval_flow",
  "permissions",
  "system_settings",
  "holidays",
  "audit_log",
];

const initialPermissionMatrix = modules.reduce((acc, moduleName) => {
  acc[moduleName] = {
    view: true,
    create: !["dashboard", "reports", "payroll", "approval_flow", "permissions", "system_settings", "audit_log"].includes(moduleName),
    edit: !["dashboard", "reports", "payroll", "audit_log"].includes(moduleName),
    delete: ["employee", "contract", "permissions"].includes(moduleName),
  };
  return acc;
}, {} as Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>);

const UserPermissions = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(0);
  const [roleCatalog, setRoleCatalog] = useState<RoleCatalogRow[]>(fallbackRolesCatalog);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [matrix, setMatrix] = useState(initialPermissionMatrix);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixSaving, setMatrixSaving] = useState(false);
  const [matrixMessage, setMatrixMessage] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    userId: "",
    role: fallbackRolesCatalog[0].name,
    companyScope: "All Companies",
    departmentScope: "All Departments",
  });

  const userMap = useMemo(() => {
    const map = new Map<number, { username: string; displayName: string }>();
    users.forEach((u) => map.set(u.id, { username: u.username, displayName: u.displayName }));
    return map;
  }, [users]);

  const assignments = useMemo(() => {
    return users
      .filter((u) => !!u.roles)
      .flatMap((u) => {
        const roleParts = String(u.roles)
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        return roleParts.map((roleName) => ({
          userId: u.id,
          role: roleName,
          companyScope: u.companies || "-",
          departmentScope: "-",
        }));
      });
  }, [users]);

  const currentUserId = Number((user as any)?.user_id || 0);
  const isSuperAdmin = String((user as any)?.role || "").toLowerCase() === "super admin" || Number((user as any)?.role_level || 0) >= 99;

  const selectedRoleName = roleCatalog[selectedRole]?.name;
  const matrixModuleKeys = useMemo(() => {
    const serverKeys = Object.keys(matrix || {});
    const knownFirst = modules.filter((m) => serverKeys.includes(m));
    const extraFromServer = serverKeys.filter((m) => !knownFirst.includes(m));
    return [...knownFirst, ...extraFromServer];
  }, [matrix]);

  useEffect(() => {
    const fetchRoleCatalog = async () => {
      try {
        const res = await apiGet<any>("/users/roles");
        const rows = Array.isArray(res) ? res : res?.data || [];
        const mapped: RoleCatalogRow[] = rows.map((row: any) => ({
          id: Number(row.id),
          name: String(row.role_name || row.name || ""),
          roleLevel: Number(row.role_level || 0),
          description: String(row.role_name || row.name || ""),
        })).filter((row: RoleCatalogRow) => row.id > 0 && row.name);

        if (mapped.length > 0) {
          setRoleCatalog(mapped);
          setNewAssignment((prev) => ({
            ...prev,
            role: mapped.some((r) => r.name === prev.role) ? prev.role : mapped[0].name,
          }));
          setSelectedRole((prev) => Math.min(prev, mapped.length - 1));
        }
      } catch (error) {
        console.error("Failed to fetch roles catalog, fallback to defaults:", error);
      }
    };

    fetchRoleCatalog();
  }, []);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await apiGet<any>("/users");
      const rows = Array.isArray(res) ? res : res?.data || [];
      const mapped = rows.map((row: any) => ({
        id: Number(row.id),
        username: String(row.username || ""),
        email: String(row.email || ""),
        displayName: String(row.username || row.email || "-"),
        lastLogin: row.last_login ? String(row.last_login) : "-",
        status: String(row.status || "active").toLowerCase() === "locked" ? "locked" : String(row.status || "active").toLowerCase(),
        roles: String(row.roles || ""),
        companies: String(row.companies || ""),
      }));

      setUsers(mapped);
      setNewAssignment((prev) => ({ ...prev, userId: mapped[0] ? String(mapped[0].id) : "" }));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const loadSelectedUserScope = async () => {
      const selectedId = Number(newAssignment.userId || 0);
      if (!selectedId) return;

      try {
        const res = await apiGet<any>(`/users/${selectedId}`);
        const userData = res?.data || res;
        const companyIds = String(userData?.company_ids || "").trim();
        setNewAssignment((prev) => ({
          ...prev,
          companyScope: companyIds || prev.companyScope || "All Companies",
        }));
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      }
    };

    loadSelectedUserScope();
  }, [newAssignment.userId]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await apiGet<any>("/admin/audit-logs?limit=100");
        const rows = Array.isArray(res) ? res : res?.data || [];
        setLogs(
          rows.map((row: any) => ({
            id: Number(row.id),
            user: String(row.username || row.user_id || "-"),
            action: String(row.action || "-"),
            target: String(row.target || "-"),
            when: String(row.created_at || "-"),
          }))
        );
      } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        setLogs([]);
      }
    };

    fetchLogs();
  }, []);

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
        setMatrixMessage(t("userPermission.messages.loadFailedUsingDefault"));
      } finally {
        setMatrixLoading(false);
      }
    };

    fetchMatrix();
  }, [selectedRoleName]);

  const toggleUserStatus = async (id: number, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "locked" : "active";
    try {
      await apiPut(`/users/${id}`, { status: nextStatus });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u)));
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
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
    const roleId = roleCatalog.find((r) => r.name === newAssignment.role)?.id;
    if (!newAssignment.userId || !roleId) return;

    apiPost(`/users/${newAssignment.userId}/assign-role`, {
      role_id: roleId,
    })
      .then(() => fetchUsers())
      .catch((error) => console.error("Failed to assign role:", error));
  };

  const handleSaveMatrix = async () => {
    if (!selectedRoleName) return;
    try {
      setMatrixSaving(true);
      await apiPut(`/admin/permission-matrix/${encodeURIComponent(selectedRoleName)}`, { matrix });
      setMatrixMessage(`${t("userPermission.messages.saveSuccessPrefix")}: ${selectedRoleName}`);
    } catch (error: any) {
      console.error("Failed to save permission matrix:", error);
      const msg = error instanceof Error ? error.message : t("userPermission.messages.saveFailed");
      setMatrixMessage(msg);
    } finally {
      setMatrixSaving(false);
    }
  };

  const handleCreateUser = async () => {
    const username = window.prompt("Username");
    if (!username) return;
    const email = window.prompt("Email");
    if (!email) return;
    const password = window.prompt("Password (min 6 chars)");
    if (!password) return;

    try {
      await apiPost("/users", {
        username,
        email,
        password,
        status: "active",
      });
      await fetchUsers();
    } catch (error) {
      console.error("Failed to create user:", error);
      alert(t("userPermission.messages.saveFailed"));
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!isSuperAdmin) {
      alert("Only Super Admin can delete users.");
      return;
    }
    if (!window.confirm("Delete this user account?")) return;

    try {
      await apiDelete(`/users/${id}`);
      await fetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Delete user failed.");
    }
  };

  const handleRemoveRole = async (targetUserId: number, roleName: string) => {
    const roleId = roleCatalog.find((r) => r.name.toLowerCase() === roleName.toLowerCase())?.id;
    if (!roleId) {
      alert(`Unknown role: ${roleName}`);
      return;
    }

    try {
      await apiDeleteWithBody(`/users/${targetUserId}/remove-role`, { role_id: roleId });
      await fetchUsers();
    } catch (error) {
      console.error("Failed to remove role:", error);
      alert("Remove role failed.");
    }
  };

  const handleChangeOwnPassword = async () => {
    if (!currentUserId) return;

    const oldPassword = window.prompt("Current password");
    if (!oldPassword) return;
    const newPassword = window.prompt("New password");
    if (!newPassword) return;

    try {
      await apiPut(`/users/${currentUserId}/change-password`, { oldPassword, newPassword });
      alert("Password updated successfully.");
    } catch (error) {
      console.error("Failed to change password:", error);
      alert("Change password failed.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-6">
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("userPermission.tabs.accounts")}</h3>
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> {t("userPermission.accounts.title")}</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleChangeOwnPassword}>Change My Password</Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCreateUser}><Plus className="h-4 w-4" /> {t("userPermission.accounts.addUser")}</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.accounts.table.emailUsername")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.accounts.table.displayName")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.accounts.table.lastLogin")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.accounts.table.status")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.accounts.table.action")}</th>
                </tr></thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading...</td>
                    </tr>
                  ) : null}
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
                          {t(`userPermission.status.${u.status}`, u.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => toggleUserStatus(u.id, u.status)}>
                            {u.status === "active" ? t("userPermission.accounts.actions.lock") : t("userPermission.accounts.actions.unlock")}
                          </Button>
                          {isSuperAdmin && (
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(u.id)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("userPermission.tabs.roles")}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role List */}
            <div className="space-y-2">
              {roleCatalog.map((r, i) => (
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
              <Button variant="outline" className="w-full gap-1.5 mt-2"><Plus className="h-4 w-4" /> {t("userPermission.roles.newRole")}</Button>
            </div>

            {/* Permission Matrix */}
            <Card className="shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  {t("userPermission.roles.permissionMatrix")} - {roleCatalog[selectedRole]?.name || "-"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matrixMessage ? <p className="text-xs mb-3 text-muted-foreground">{matrixMessage}</p> : null}
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">{t("userPermission.roles.table.module")}</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">{t("userPermission.roles.table.view")}</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">{t("userPermission.roles.table.create")}</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">{t("userPermission.roles.table.edit")}</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">{t("userPermission.roles.table.delete")}</th>
                  </tr></thead>
                  <tbody>
                    {matrixModuleKeys.map((m) => {
                      const row = matrix[m];
                      if (!row) return null;
                      return (
                        <tr key={m} className="border-b last:border-b-0">
                          <td className="px-4 py-2.5 capitalize font-medium">{t(`userPermission.modules.${m}`, m.replaceAll("_", " "))}</td>
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
                    {matrixLoading ? t("userPermission.roles.loading") : matrixSaving ? t("userPermission.roles.saving") : t("userPermission.roles.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("userPermission.tabs.assignments")}</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="shadow-card lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><UserCog className="h-4 w-4" /> {t("userPermission.assignments.assignRole")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("userPermission.assignments.fields.user")}</p>
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
                  <p className="text-xs text-muted-foreground mb-1">{t("userPermission.assignments.fields.role")}</p>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newAssignment.role}
                    onChange={(e) => setNewAssignment((prev) => ({ ...prev, role: e.target.value }))}
                  >
                    {roleCatalog.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("userPermission.assignments.fields.companyScope")}</p>
                  <Input value={newAssignment.companyScope} onChange={(e) => setNewAssignment((prev) => ({ ...prev, companyScope: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("userPermission.assignments.fields.departmentScope")}</p>
                  <Input value={newAssignment.departmentScope} onChange={(e) => setNewAssignment((prev) => ({ ...prev, departmentScope: e.target.value }))} />
                </div>
                <Button size="sm" className="w-full" onClick={handleAddAssignment}>{t("userPermission.assignments.addAssignment")}</Button>
              </CardContent>
            </Card>

            <Card className="shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> {t("userPermission.assignments.table.title")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.assignments.table.user")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.assignments.table.role")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.assignments.table.companyScope")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.assignments.table.departmentScope")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                  </tr></thead>
                  <tbody>
                    {assignments.map((a, idx) => {
                      const userInfo = userMap.get(a.userId);
                      return (
                        <tr key={`${a.userId}-${a.role}-${idx}`} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3">{userInfo?.displayName || t("userPermission.assignments.table.unknown")}</td>
                          <td className="px-4 py-3"><Badge variant="default" className="text-xs">{a.role}</Badge></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{a.companyScope}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{a.departmentScope}</td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => handleRemoveRole(a.userId, a.role)}>
                              Remove Role
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("userPermission.tabs.logs")}</h3>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4" /> {t("userPermission.logs.title")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.logs.table.user")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.logs.table.action")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.logs.table.target")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("userPermission.logs.table.datetime")}</th>
                </tr></thead>
                <tbody>
                  {logs.map((log) => (
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
        </div>
      </div>
    </div>
  );
};

export default UserPermissions;
