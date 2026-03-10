import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const logs = [
  { id: 1, time: "2026-03-10 09:12:05", user: "admin_root", action: "LOGIN", target: "System", ip: "10.10.1.12" },
  { id: 2, time: "2026-03-10 09:20:31", user: "admin_root", action: "CREATE_USER", target: "user: hr_company_abc", ip: "10.10.1.12" },
  { id: 3, time: "2026-03-10 09:44:19", user: "it_impl", action: "UPDATE_ROLE", target: "user: manager_xyz", ip: "10.10.1.18" },
  { id: 4, time: "2026-03-10 10:05:52", user: "admin_root", action: "DELETE_DATA", target: "attendance: #9932", ip: "10.10.1.12" },
];

const actionColor: Record<string, string> = {
  LOGIN: "default",
  CREATE_USER: "secondary",
  UPDATE_ROLE: "secondary",
  DELETE_DATA: "destructive",
};

const AuditLog = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Transaction Log (Audit Trail)</CardTitle>
          <Button size="sm" variant="outline">Export Log</Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Target</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{l.time}</td>
                  <td className="px-4 py-3">{l.user}</td>
                  <td className="px-4 py-3">
                    <Badge variant={actionColor[l.action] as "default" | "secondary" | "destructive"}>{l.action}</Badge>
                  </td>
                  <td className="px-4 py-3">{l.target}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
