import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plus, Settings } from "lucide-react";

const leaveTypes = [
  { type: "Vacation (พักร้อน)", companyA: 6, companyB: 10, companyC: 8 },
  { type: "Sick Leave (ลาป่วย)", companyA: 30, companyB: 30, companyC: 30 },
  { type: "Personal Leave (ลากิจ)", companyA: 3, companyB: 5, companyC: 3 },
  { type: "Maternity (ลาคลอด)", companyA: 90, companyB: 90, companyC: 90 },
];

const holidays = [
  { date: "2026-01-01", name: "วันขึ้นปีใหม่" },
  { date: "2026-02-26", name: "วันมาฆบูชา" },
  { date: "2026-04-06", name: "วันจักรี" },
  { date: "2026-04-13", name: "วันสงกรานต์" },
  { date: "2026-04-14", name: "วันสงกรานต์" },
  { date: "2026-04-15", name: "วันสงกรานต์" },
  { date: "2026-05-01", name: "วันแรงงาน" },
  { date: "2026-05-04", name: "วันฉัตรมงคล" },
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษา ร.10" },
  { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษา ร.10 (ชดเชย)" },
  { date: "2026-08-12", name: "วันแม่แห่งชาติ" },
  { date: "2026-10-23", name: "วันปิยมหาราช" },
  { date: "2026-12-05", name: "วันพ่อแห่งชาติ" },
  { date: "2026-12-10", name: "วันรัฐธรรมนูญ" },
  { date: "2026-12-31", name: "วันสิ้นปี" },
];

const LeaveManagement = () => (
  <div className="space-y-6 animate-fade-in">
    <Tabs defaultValue="policy">
      <TabsList>
        <TabsTrigger value="policy">Leave Policy</TabsTrigger>
        <TabsTrigger value="calendar">Leave Calendar</TabsTrigger>
        <TabsTrigger value="holidays">Holiday Management</TabsTrigger>
      </TabsList>

      <TabsContent value="policy" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Leave Configuration by Company</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Leave Type</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">🔵 ABC</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">🟢 XYZ</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">🟠 DEF</th>
              </tr></thead>
              <tbody>
                {leaveTypes.map((l) => (
                  <tr key={l.type} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{l.type}</td>
                    <td className="px-4 py-3 text-center">{l.companyA} days</td>
                    <td className="px-4 py-3 text-center">{l.companyB} days</td>
                    <td className="px-4 py-3 text-center">{l.companyC} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="calendar" className="mt-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Calendar className="h-10 w-10 mr-3 opacity-40" />
              <p className="text-sm">Leave Calendar view - showing team leave overview (demo placeholder)</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="holidays" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Holiday Calendar 2026</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Add Holiday</Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Holiday Name</th>
              </tr></thead>
              <tbody>
                {holidays.map((h, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{h.date}</td>
                    <td className="px-4 py-3">{h.name}</td>
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

export default LeaveManagement;
