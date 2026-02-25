import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Check, X } from "lucide-react";

const shiftData = [
  { name: "กะเช้า (Morning)", time: "08:00 - 17:00", employees: 62 },
  { name: "กะบ่าย (Afternoon)", time: "14:00 - 23:00", employees: 18 },
  { name: "กะดึก (Night)", time: "22:00 - 07:00", employees: 12 },
];

const attendanceLog = [
  { code: "A-0001", name: "สมชาย วงศ์สวัสดิ์", timeIn: "07:55", timeOut: "17:32", status: "present" },
  { code: "A-0002", name: "สมหญิง ใจดี", timeIn: "08:12", timeOut: "18:05", status: "late" },
  { code: "A-0003", name: "ประสิทธิ์ แก้วมณี", timeIn: "-", timeOut: "-", status: "absent" },
  { code: "B-0001", name: "วิชัย พงษ์ทอง", timeIn: "07:48", timeOut: "17:15", status: "present" },
  { code: "B-0002", name: "นภา สุขสันต์", timeIn: "-", timeOut: "-", status: "leave" },
];

const otRequests = [
  { id: 1, name: "สมหญิง ใจดี", date: "2026-02-22", hours: 2.5, amount: 750, status: "pending" },
  { id: 2, name: "ประสิทธิ์ แก้วมณี", date: "2026-02-21", hours: 3, amount: 900, status: "pending" },
  { id: 3, name: "ธนา รุ่งเรือง", date: "2026-02-20", hours: 1.5, amount: 525, status: "approved" },
];

const statusBadge: Record<string, string> = {
  present: "bg-success/10 text-success",
  late: "bg-warning/10 text-warning",
  absent: "bg-destructive/10 text-destructive",
  leave: "bg-info/10 text-info",
};

const TimeAttendance = () => (
  <div className="space-y-6 animate-fade-in">
    <Tabs defaultValue="shifts">
      <TabsList>
        <TabsTrigger value="shifts">Work Schedule</TabsTrigger>
        <TabsTrigger value="attendance">Attendance Log</TabsTrigger>
        <TabsTrigger value="ot">OT Approval</TabsTrigger>
      </TabsList>

      <TabsContent value="shifts" className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {shiftData.map((s) => (
            <Card key={s.name} className="shadow-card">
              <CardContent className="p-5 text-center">
                <p className="font-semibold">{s.name}</p>
                <p className="text-2xl font-bold text-primary mt-2">{s.time}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.employees} employees</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="attendance" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attendance Log</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Upload className="h-4 w-4" /> Import File
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time In</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time Out</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr></thead>
              <tbody>
                {attendanceLog.map((a) => (
                  <tr key={a.code} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                    <td className="px-4 py-3">{a.name}</td>
                    <td className="px-4 py-3">{a.timeIn}</td>
                    <td className="px-4 py-3">{a.timeOut}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusBadge[a.status]}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ot" className="mt-4">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">OT Approval</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hours</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr></thead>
              <tbody>
                {otRequests.map((o) => (
                  <tr key={o.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{o.name}</td>
                    <td className="px-4 py-3">{o.date}</td>
                    <td className="px-4 py-3">{o.hours}h</td>
                    <td className="px-4 py-3">฿{o.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {o.status === "pending" ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success"><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs capitalize">{o.status}</Badge>
                      )}
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

export default TimeAttendance;
