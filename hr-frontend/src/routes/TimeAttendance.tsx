import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";
import { useMemo, useState } from "react";

const shiftData = [
  { id: 1, shiftName: "กะเช้า (Morning)", timeIn: "08:00", timeOut: "17:00", graceMinutes: 15, employees: 62 },
  { id: 2, shiftName: "กะบ่าย (Afternoon)", timeIn: "14:00", timeOut: "23:00", graceMinutes: 10, employees: 18 },
  { id: 3, shiftName: "กะดึก (Night)", timeIn: "22:00", timeOut: "07:00", graceMinutes: 20, employees: 12 },
];

const attendanceLog = [
  {
    id: 1,
    workDate: "2026-03-10",
    code: "A-0001",
    name: "สมชาย วงศ์สวัสดิ์",
    timeIn: "07:55",
    timeOut: "17:32",
    status: "present",
    gps: "13.7563,100.5018",
  },
  {
    id: 2,
    workDate: "2026-03-10",
    code: "A-0002",
    name: "สมหญิง ใจดี",
    timeIn: "08:12",
    timeOut: "18:05",
    status: "late",
    gps: "13.7446,100.5329",
  },
  {
    id: 3,
    workDate: "2026-03-10",
    code: "A-0003",
    name: "ประสิทธิ์ แก้วมณี",
    timeIn: "-",
    timeOut: "-",
    status: "absent",
    gps: "-",
  },
  {
    id: 4,
    workDate: "2026-03-10",
    code: "B-0001",
    name: "วิชัย พงษ์ทอง",
    timeIn: "08:01",
    timeOut: "-",
    status: "missing_scan",
    gps: "13.7317,100.5686",
  },
  {
    id: 5,
    workDate: "2026-03-09",
    code: "B-0002",
    name: "นภา สุขสันต์",
    timeIn: "07:57",
    timeOut: "17:14",
    status: "present",
    gps: "13.7500,100.5160",
  },
];

const otRequests = [
  {
    id: 1,
    employeeName: "สมหญิง ใจดี",
    requestDate: "2026-03-10",
    startTime: "18:30",
    endTime: "21:00",
    totalHours: 2.5,
    reason: "ปิดงาน Payroll ประจำเดือน",
    approverName: "วิชัย พงษ์ทอง",
    status: "pending",
  },
  {
    id: 2,
    employeeName: "ประสิทธิ์ แก้วมณี",
    requestDate: "2026-03-09",
    startTime: "17:30",
    endTime: "20:30",
    totalHours: 3,
    reason: "Deploy ระบบ attendance ใหม่",
    approverName: "วิชัย พงษ์ทอง",
    status: "pending",
  },
  {
    id: 3,
    employeeName: "ธนา รุ่งเรือง",
    requestDate: "2026-03-08",
    startTime: "18:00",
    endTime: "19:30",
    totalHours: 1.5,
    reason: "แก้ incident production",
    approverName: "พิมพ์ชนก ศิริวัฒน์",
    status: "approved",
  },
];

const statusBadge: Record<string, string> = {
  present: "bg-success/10 text-success",
  late: "bg-warning/10 text-warning",
  absent: "bg-destructive/10 text-destructive",
  missing_scan: "bg-orange-100 text-orange-700",
};

const otStatusBadge: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
};

const TimeAttendance = () => {
  const { hasPermission, hasRole } = useAuth();
  const isCentralHr = hasRole(UserRole.CENTRAL_HR);
  const canApproveOt = !isCentralHr && (hasPermission(Permission.APPROVE_DEPARTMENT_OT) || hasPermission(Permission.MANAGE_COMPANY_OT) || hasPermission(Permission.MANAGE_ALL_OT));
  const canEditTeamShift = canApproveOt || hasPermission(Permission.MANAGE_ATTENDANCE);
  const canRunOtPayrollPrep = hasPermission(Permission.MANAGE_COMPANY_OT) || hasPermission(Permission.MANAGE_ALL_OT);

  const [scheduleRows, setScheduleRows] = useState(shiftData);
  const [attendanceRows] = useState(attendanceLog);
  const [otRows, setOtRows] = useState(otRequests);
  const [newOt, setNewOt] = useState({
    requestDate: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const computedHours = useMemo(() => {
    if (!newOt.startTime || !newOt.endTime) return 0;
    const [sh, sm] = newOt.startTime.split(":").map(Number);
    const [eh, em] = newOt.endTime.split(":").map(Number);
    if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return 0;
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const diff = endMinutes - startMinutes;
    if (diff <= 0) return 0;
    return Math.round((diff / 60) * 10) / 10;
  }, [newOt.endTime, newOt.startTime]);

  const handleSubmitOt = () => {
    if (!newOt.requestDate || !newOt.startTime || !newOt.endTime || !newOt.reason) {
      alert("กรุณากรอกข้อมูล OT Request ให้ครบ");
      return;
    }
    if (computedHours <= 0) {
      alert("เวลา OT ไม่ถูกต้อง");
      return;
    }

    setOtRows((prev) => [
      {
        id: Date.now(),
        employeeName: "ผู้ใช้งานปัจจุบัน",
        requestDate: newOt.requestDate,
        startTime: newOt.startTime,
        endTime: newOt.endTime,
        totalHours: computedHours,
        reason: newOt.reason,
        approverName: "รอผู้อนุมัติ",
        status: "pending",
      },
      ...prev,
    ]);

    setNewOt({ requestDate: "", startTime: "", endTime: "", reason: "" });
  };

  const handleUpdateOtStatus = (id: number, status: "approved" | "rejected") => {
    setOtRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
  };

  const handleGracePeriodChange = (id: number, value: string) => {
    const next = Number(value);
    if (Number.isNaN(next) || next < 0) return;
    setScheduleRows((prev) => prev.map((row) => (row.id === id ? { ...row, graceMinutes: next } : row)));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="shifts">
        <TabsList>
          <TabsTrigger value="shifts">Work Schedule</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Log</TabsTrigger>
          {!isCentralHr && <TabsTrigger value="ot-request">OT Request</TabsTrigger>}
          {canApproveOt && <TabsTrigger value="ot-approval">OT Approval</TabsTrigger>}
        </TabsList>

      <TabsContent value="shifts" className="mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {scheduleRows.map((s) => (
            <Card key={s.id} className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <p className="font-semibold">{s.shiftName}</p>
                <p className="text-sm text-muted-foreground">พนักงานในกะ: {s.employees} คน</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Time In</p>
                    <Input value={s.timeIn} readOnly />
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Time Out</p>
                    <Input value={s.timeOut} readOnly />
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Grace Period (นาที)</p>
                  <Input
                    type="number"
                    value={s.graceMinutes}
                    onChange={(e) => handleGracePeriodChange(s.id, e.target.value)}
                    disabled={!canEditTeamShift}
                  />
                </div>
                {canEditTeamShift && (
                  <Button size="sm" variant="outline" className="mt-2">Save Shift Rule</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="attendance" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attendance Log</CardTitle>
            {!isCentralHr && (
              <Button size="sm" variant="outline" className="gap-1.5">
                <Upload className="h-4 w-4" /> Import File
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scan In</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Scan Out</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">GPS</th>
              </tr></thead>
              <tbody>
                {attendanceRows.map((a) => (
                  <tr key={a.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-mono text-xs">{a.workDate}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                    <td className="px-4 py-3">{a.name}</td>
                    <td className="px-4 py-3">{a.timeIn}</td>
                    <td className="px-4 py-3">{a.timeOut}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusBadge[a.status]}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{a.gps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>

      {!isCentralHr && (
      <TabsContent value="ot-request" className="mt-4">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Submit OT Request</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">วันที่ขอทำ OT</p>
                  <Input type="date" value={newOt.requestDate} onChange={(e) => setNewOt((p) => ({ ...p, requestDate: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">เวลาเริ่มต้น</p>
                    <Input type="time" value={newOt.startTime} onChange={(e) => setNewOt((p) => ({ ...p, startTime: e.target.value }))} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">เวลาสิ้นสุด</p>
                    <Input type="time" value={newOt.endTime} onChange={(e) => setNewOt((p) => ({ ...p, endTime: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">เหตุผลที่ขอ OT</p>
                <Textarea value={newOt.reason} onChange={(e) => setNewOt((p) => ({ ...p, reason: e.target.value }))} />
              </div>
              <div className="text-sm text-muted-foreground">จำนวนชั่วโมงรวม: <span className="font-semibold text-foreground">{computedHours} ชั่วโมง</span></div>
              <Button size="sm" onClick={handleSubmitOt}>Create OT Request</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canApproveOt && (
        <TabsContent value="ot-approval" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">OT Approval</CardTitle>
            {canRunOtPayrollPrep && (
              <Button size="sm" variant="outline">Calculate OT for Payroll</Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Request Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start-End</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total Hours</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Approver</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr></thead>
              <tbody>
                {otRows.map((o) => (
                  <tr key={o.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{o.employeeName}</td>
                    <td className="px-4 py-3">{o.requestDate}</td>
                    <td className="px-4 py-3">{o.startTime} - {o.endTime}</td>
                    <td className="px-4 py-3">{o.totalHours}h</td>
                    <td className="px-4 py-3 max-w-[240px] truncate" title={o.reason}>{o.reason}</td>
                    <td className="px-4 py-3">{o.approverName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={otStatusBadge[o.status] || ""}>{o.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {o.status === "pending" ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success" onClick={() => handleUpdateOtStatus(o.id, "approved")}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleUpdateOtStatus(o.id, "rejected")}><X className="h-4 w-4" /></Button>
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
      )}
    </Tabs>
  </div>
  );
};

export default TimeAttendance;
