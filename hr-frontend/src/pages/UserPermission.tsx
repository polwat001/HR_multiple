import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Users } from "lucide-react";

const roles = [
  {
    id: 1, name: "Super Admin", description: "Full access to all modules and companies",
    permissions: { dashboard: true, organization: true, employee: true, attendance: true, leave: true, contract: true, reports: true, permissions: true },
  },
  {
    id: 2, name: "HR Manager", description: "Manage HR operations for assigned companies",
    permissions: { dashboard: true, organization: true, employee: true, attendance: true, leave: true, contract: true, reports: true, permissions: false },
  },
  {
    id: 3, name: "Line Manager", description: "Approve team requests, view team data",
    permissions: { dashboard: true, organization: false, employee: true, attendance: true, leave: true, contract: false, reports: false, permissions: false },
  },
  {
    id: 4, name: "Employee (Self-Service)", description: "View own data, submit leave/OT",
    permissions: { dashboard: true, organization: false, employee: false, attendance: true, leave: true, contract: false, reports: false, permissions: false },
  },
];

const userAssignments = [
  { user: "สมชาย วงศ์สวัสดิ์", assignments: [{ role: "Super Admin", scope: "All Companies" }] },
  { user: "สมหญิง ใจดี", assignments: [{ role: "Employee (Self-Service)", scope: "ABC Holdings" }] },
  { user: "วิชัย พงษ์ทอง", assignments: [
    { role: "HR Manager", scope: "XYZ Services" },
    { role: "Line Manager", scope: "ABC Holdings" },
  ]},
  { user: "นภา สุขสันต์", assignments: [{ role: "HR Manager", scope: "XYZ Services" }] },
  { user: "อรุณ ศรีสุข", assignments: [{ role: "Line Manager", scope: "DEF Manufacturing" }] },
];

const modules = ["dashboard", "organization", "employee", "attendance", "leave", "contract", "reports", "permissions"];

const UserPermissions = () => {
  const [selectedRole, setSelectedRole] = useState(0);

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Role Management</TabsTrigger>
          <TabsTrigger value="assignments">User Assignment</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role List */}
            <div className="space-y-2">
              {roles.map((r, i) => (
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
                  Permission Matrix — {roles[selectedRole].name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Module</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">View</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Edit</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Approve</th>
                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">Delete</th>
                  </tr></thead>
                  <tbody>
                    {modules.map((m) => {
                      const hasAccess = roles[selectedRole].permissions[m as keyof typeof roles[0]["permissions"]];
                      return (
                        <tr key={m} className="border-b last:border-b-0">
                          <td className="px-4 py-2.5 capitalize font-medium">{m}</td>
                          <td className="text-center px-4 py-2.5"><Checkbox checked={hasAccess} /></td>
                          <td className="text-center px-4 py-2.5"><Checkbox checked={hasAccess && m !== "dashboard"} /></td>
                          <td className="text-center px-4 py-2.5"><Checkbox checked={hasAccess && ["attendance", "leave", "contract"].includes(m)} /></td>
                          <td className="text-center px-4 py-2.5"><Checkbox checked={roles[selectedRole].name === "Super Admin"} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> User Assignments</CardTitle>
              <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Add Assignment</Button>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assignments</th>
                </tr></thead>
                <tbody>
                  {userAssignments.map((u) => (
                    <tr key={u.user} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{u.user}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {u.assignments.map((a, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <Badge variant="default" className="text-xs">{a.role}</Badge>
                              <span className="text-xs text-muted-foreground">@ {a.scope}</span>
                            </div>
                          ))}
                        </div>
                      </td>
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
