import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Check, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";

const shiftData = [
  { id: 1, shiftName: "กะเช้า (Morning)", timeIn: "08:00", timeOut: "17:00", graceMinutes: 15, employees: 62 },
  { id: 2, shiftName: "กะบ่าย (Afternoon)", timeIn: "14:00", timeOut: "23:00", graceMinutes: 10, employees: 18 },
  { id: 3, shiftName: "กะดึก (Night)", timeIn: "22:00", timeOut: "07:00", graceMinutes: 20, employees: 12 },
];

const toUiAttendanceRow = (row: any) => ({
  id: Number(row.id),
  workDate: row.work_date || "-",
  code: row.employee_code || "-",
  name: `${row.firstname_th || ""} ${row.lastname_th || ""}`.trim() || "-",
  timeIn: row.check_in_time || "-",
  timeOut: row.check_out_time || "-",
  status: String(row.status || "present").toLowerCase(),
  gps: row.gps || "-",
});

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

const toUiOtRow = (row: any) => ({
  id: Number(row.id),
  employeeName: `${row.firstname_th || ""} ${row.lastname_th || ""}`.trim() || row.employee_code || "-",
  requestDate: row.request_date || "-",
  startTime: row.start_time || "-",
  endTime: row.end_time || "-",
  totalHours: Number(row.total_hours || 0),
  reason: row.reason || "-",
  approverName: row.approver_name || "รอผู้อนุมัติ",
  status: String(row.status || "pending").toLowerCase(),
});

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
  const isEmployeeOnly =
    hasPermission(Permission.VIEW_OWN_ATTENDANCE) &&
    !hasPermission(Permission.VIEW_DEPARTMENT_ATTENDANCE) &&
    !hasPermission(Permission.VIEW_COMPANY_ATTENDANCE) &&
    !hasPermission(Permission.MANAGE_ATTENDANCE);

  const [scheduleRows, setScheduleRows] = useState(shiftData);
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [otRows, setOtRows] = useState(otRequests);
  const [newOt, setNewOt] = useState({
    requestDate: "",
    startTime: "",
    endTime: "",
    reason: "",
  });
  const [isSubmittingOt, setIsSubmittingOt] = useState(false);
  const [showEmployeeOtForm, setShowEmployeeOtForm] = useState(false);
  const [employeeOtRows, setEmployeeOtRows] = useState<Array<{
    id: number;
    requestDate: string;
    startTime: string;
    endTime: string;
    totalHours: number;
    reason: string;
    status: "pending" | "approved";
  }>>([]);

  useEffect(() => {
    const fetchOt = async () => {
      try {
        const res = await apiGet<any>("/ot/requests");
        const rows = Array.isArray(res) ? res : res?.data || [];
        setOtRows(rows.map(toUiOtRow));
      } catch (error) {
        console.error("Failed to fetch OT requests:", error);
      }
    };

    const fetchAttendance = async () => {
      try {
        const res = await apiGet<any>("/attendance");
        const rows = Array.isArray(res) ? res : res?.data || [];
        setAttendanceRows(rows.map(toUiAttendanceRow));
      } catch (error) {
        console.error("Failed to fetch attendance logs:", error);
      }
    };

    fetchOt();
    fetchAttendance();
  }, []);

  const visibleScheduleRows = isEmployeeOnly ? scheduleRows.slice(0, 1) : scheduleRows;

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

  const handleSubmitOt = async () => {
    if (!newOt.requestDate || !newOt.startTime || !newOt.endTime || !newOt.reason) {
      alert("กรุณากรอกข้อมูล OT Request ให้ครบ");
      return;
    }
    if (computedHours <= 0) {
      alert("เวลา OT ไม่ถูกต้อง");
      return;
    }

    try {
      setIsSubmittingOt(true);
      await apiPost<any>("/ot/request", {
        request_date: newOt.requestDate,
        start_time: newOt.startTime,
        end_time: newOt.endTime,
        reason: newOt.reason,
      });

      if (isEmployeeOnly) {
        setEmployeeOtRows((prev) => [
          {
            id: Date.now(),
            requestDate: newOt.requestDate,
            startTime: newOt.startTime,
            endTime: newOt.endTime,
            totalHours: computedHours,
            reason: newOt.reason,
            status: "pending",
          },
          ...prev,
        ]);
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
      setShowEmployeeOtForm(false);
      alert("ส่งคำขอ OT เรียบร้อยแล้ว");
    } catch (error) {
      console.error("Create OT request failed:", error);
      alert("ไม่สามารถส่งคำขอ OT ได้");
    } finally {
      setIsSubmittingOt(false);
    }
  };

  const handleUpdateOtStatus = (id: number, status: "approved" | "rejected") => {
    const run = async () => {
      try {
        await apiPut(`/ot/${id}/status`, { status });
        setOtRows((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
      } catch (error) {
        console.error("Failed to update OT status:", error);
        alert("ไม่สามารถอัปเดตสถานะ OT ได้");
      }
    };
    run();
  };

  const handleGracePeriodChange = (id: number, value: string) => {
    const next = Number(value);
    if (Number.isNaN(next) || next < 0) return;
    setScheduleRows((prev) => prev.map((row) => (row.id === id ? { ...row, graceMinutes: next } : row)));
  };

  if (isEmployeeOnly) {
    const myShift = visibleScheduleRows[0];

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 font-medium">พนักงาน</span>
          <span className="text-muted-foreground">ดูเฉพาะตารางของคุณ</span>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">ตารางงานของคุณ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/40 border border-border px-6 py-4 text-center">
              <p className="font-semibold text-foreground">{myShift?.shiftName || "-"}</p>
              <p className="text-3xl font-bold text-primary mt-1">{myShift?.timeIn || "-"} - {myShift?.timeOut || "-"}</p>
              <p className="text-sm text-muted-foreground mt-1">พัก 12:00 - 13:00</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">คำขอ OT ของคุณ</CardTitle>
            <Button size="sm" onClick={() => setShowEmployeeOtForm((v) => !v)}>
              + ขอ OT
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {showEmployeeOtForm && (
              <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
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
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSubmitOt} disabled={isSubmittingOt}>{isSubmittingOt ? "กำลังส่ง..." : "ยืนยันส่งคำขอ"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowEmployeeOtForm(false)}>ยกเลิก</Button>
                </div>
              </div>
            )}

            {employeeOtRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">ดูคำขอ OT ได้ที่หน้า Self-Service</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">วันที่</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">เวลา</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">ชั่วโมง</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeOtRows.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{r.requestDate}</td>
                      <td className="px-3 py-2">{r.startTime} - {r.endTime}</td>
                      <td className="px-3 py-2">{r.totalHours} ชม.</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={otStatusBadge[r.status] || ""}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="shifts">
        <TabsList>
          <TabsTrigger value="shifts">Work Schedule</TabsTrigger>
          {!isEmployeeOnly && <TabsTrigger value="attendance">Attendance Log</TabsTrigger>}
          {!isCentralHr && <TabsTrigger value="ot-request">OT Request</TabsTrigger>}
          {canApproveOt && <TabsTrigger value="ot-approval">คำร้องของลูกทีม (OT)</TabsTrigger>}
        </TabsList>

      <TabsContent value="shifts" className="mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visibleScheduleRows.map((s) => (
            <Card key={s.id} className="shadow-card">
              <CardContent className="p-5 space-y-2">
                <p className="font-semibold">{s.shiftName}</p>
                {isEmployeeOnly ? (
                  <p className="text-sm text-muted-foreground">กะการทำงานของฉัน</p>
                ) : (
                  <p className="text-sm text-muted-foreground">พนักงานในกะ: {s.employees} คน</p>
                )}
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

      {!isEmployeeOnly && (
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
      )}

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
              <Button size="sm" onClick={handleSubmitOt} disabled={isSubmittingOt}>{isSubmittingOt ? "กำลังส่ง..." : "Create OT Request"}</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canApproveOt && (
        <TabsContent value="ot-approval" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">คำร้องของลูกทีม (OT)</CardTitle>
            {canRunOtPayrollPrep && (
              <Button size="sm" variant="outline">คำนวณสรุป OT เพื่อส่ง Payroll</Button>
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
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success bg-success/10 hover:bg-success/20" onClick={() => handleUpdateOtStatus(o.id, "approved")}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive bg-destructive/10 hover:bg-destructive/20" onClick={() => handleUpdateOtStatus(o.id, "rejected")}><X className="h-4 w-4" /></Button>
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
