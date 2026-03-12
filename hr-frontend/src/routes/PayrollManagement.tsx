import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/roles";

const samplePayrollRows = [
  { month: "2026-01", company: "ABC", employees: 128, otAmount: 124500, leaveDeduction: 18200, netAmount: 5984300, status: "closed" },
  { month: "2026-02", company: "ABC", employees: 132, otAmount: 142000, leaveDeduction: 15100, netAmount: 6210250, status: "processing" },
  { month: "2026-03", company: "ABC", employees: 132, otAmount: 0, leaveDeduction: 0, netAmount: 0, status: "draft" },
];

export default function PayrollManagement() {
  const { hasRole } = useAuth();
  const isHrCompany = hasRole(UserRole.HR_COMPANY);
  const isCentralHr = hasRole(UserRole.CENTRAL_HR);
  const isSystemAdmin = hasRole(UserRole.SUPER_ADMIN);
  const isReadOnly = isCentralHr || isSystemAdmin;

  const [selectedMonth, setSelectedMonth] = useState("2026-03");
  const [rows] = useState(samplePayrollRows);

  const currentRow = useMemo(() => rows.find((r) => r.month === selectedMonth) || rows[0], [rows, selectedMonth]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Payroll Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isHrCompany
                ? "จัดการรอบเงินเดือนของบริษัท และส่งออกไฟล์ธนาคาร"
                : "โหมดอ่านอย่างเดียวสำหรับตรวจสอบและ support payroll"}
            </p>
          </div>
          <Badge variant="outline">
            {isHrCompany ? "HR Company (Manage)" : isCentralHr ? "Central HR (Read)" : "System Admin (Read)"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Payroll Month</p>
              <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Employees</p>
              <div className="h-10 rounded-md border border-input px-3 flex items-center text-sm bg-muted/20">{currentRow?.employees ?? 0}</div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">OT Amount</p>
              <div className="h-10 rounded-md border border-input px-3 flex items-center text-sm bg-muted/20">{(currentRow?.otAmount ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Net Amount</p>
              <div className="h-10 rounded-md border border-input px-3 flex items-center text-sm bg-muted/20">{(currentRow?.netAmount ?? 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={isReadOnly}>Run Payroll Cycle</Button>
            <Button variant="outline" disabled={isReadOnly}>Recalculate OT/Leave</Button>
            <Button variant="outline">Export Payroll Report</Button>
            <Button variant="outline" disabled={isReadOnly}>Export Bank File</Button>
            <Button variant="outline" disabled={isReadOnly}>Generate Payslip</Button>
          </div>

          {isReadOnly ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              โหมดอ่านอย่างเดียว: บทบาทนี้ใช้สำหรับตรวจสอบและ support ไม่สามารถรัน Payroll หรือสร้างไฟล์จ่ายเงินได้
            </p>
          ) : null}

          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">OT</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Leave Deduction</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.month}</td>
                  <td className="px-4 py-3">{row.company}</td>
                  <td className="px-4 py-3 text-right">{row.otAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{row.leaveDeduction.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">{row.netAmount.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{row.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
