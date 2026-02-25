import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Plus } from "lucide-react";

const contracts = [
  { id: 1, employee: "ประสิทธิ์ แก้วมณี", company: "ABC", start: "2025-03-01", end: "2026-02-28", status: "expiring", daysLeft: 5 },
  { id: 2, employee: "นภา สุขสันต์", company: "XYZ", start: "2025-03-01", end: "2026-03-01", status: "expiring", daysLeft: 6 },
  { id: 3, employee: "พิมพ์ ชัยวัฒน์", company: "DEF", start: "2025-03-10", end: "2026-03-10", status: "expiring", daysLeft: 15 },
  { id: 4, employee: "สมชาย วงศ์สวัสดิ์", company: "ABC", start: "2024-07-01", end: "2026-06-30", status: "active", daysLeft: 127 },
  { id: 5, employee: "อรุณ ศรีสุข", company: "DEF", start: "2024-05-20", end: "2026-05-20", status: "active", daysLeft: 86 },
];

const templates = [
  { id: 1, name: "สัญญาจ้างทั่วไป - ABC Holdings", company: "ABC", variables: ["{employee_name}", "{salary}", "{start_date}", "{end_date}"] },
  { id: 2, name: "สัญญาจ้างทั่วไป - XYZ Services", company: "XYZ", variables: ["{employee_name}", "{salary}", "{start_date}", "{end_date}", "{company_name}"] },
  { id: 3, name: "สัญญาทดลองงาน - Group", company: "ALL", variables: ["{employee_name}", "{position}", "{start_date}"] },
];

const statusColor: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  expiring: "bg-warning/10 text-warning border-warning/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
};

const ContractManagement = () => (
  <div className="space-y-6 animate-fade-in">
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">Contract List</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-4">
        <Card className="shadow-card overflow-hidden">
          <CardHeader><CardTitle className="text-base">Contract Management</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">End</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr></thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.employee}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{c.company}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs">{c.start}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.end}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColor[c.status]}>{c.status} ({c.daysLeft}d)</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" className="gap-1 text-xs h-7"><RefreshCw className="h-3 w-3" /> Renew</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="templates" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contract Templates</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> New Template</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {t.variables.map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{t.company}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);

export default ContractManagement;
