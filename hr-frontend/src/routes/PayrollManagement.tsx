import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/roles";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";

type PayrollStatus = "draft" | "processing" | "waiting_approval" | "completed";

type PayrollCycleRow = {
  month: string;
  company: string;
  employees: number;
  otAmount: number;
  allowanceAmount: number;
  deductionAmount: number;
  netAmount: number;
  paymentDate: string;
  status: PayrollStatus;
  note?: string;
};

type RunDataRow = {
  id: number;
  employeeCode: string;
  employeeName: string;
  baseSalary: number;
  presentDays: number;
  absentDays: number;
  otHours: number;
  leaveDays: number;
  missingScanDays: number;
};

type ExtraPayRow = {
  id: number;
  commission: number;
  travel: number;
  bonus: number;
  lateDeduction: number;
  loanDeduction: number;
};

type EmployeeSettingRow = {
  id: number;
  employeeCode: string;
  employeeName: string;
  basicSalary: number;
  bankName: string;
  bankAccountNo: string;
  taxDependent: number;
  lifeInsuranceDeduction: number;
  ssoEnabled: boolean;
};

type BankExportFormat = "KTB_TXT" | "SCB_CSV" | "GENERIC_CSV";

const samplePayrollRows: PayrollCycleRow[] = [
  {
    month: "2026-01",
    company: "ABC",
    employees: 128,
    otAmount: 124500,
    allowanceAmount: 845000,
    deductionAmount: 196200,
    netAmount: 5984300,
    paymentDate: "2026-01-31",
    status: "completed",
  },
  {
    month: "2026-02",
    company: "ABC",
    employees: 132,
    otAmount: 142000,
    allowanceAmount: 910000,
    deductionAmount: 205100,
    netAmount: 6210250,
    paymentDate: "2026-02-28",
    status: "completed",
  },
  {
    month: "2026-03",
    company: "ABC",
    employees: 136,
    otAmount: 196000,
    allowanceAmount: 1245000,
    deductionAmount: 241700,
    netAmount: 6889200,
    paymentDate: "2026-03-31",
    status: "waiting_approval",
    note: "มีจ่ายโบนัสรายไตรมาส",
  },
];

const sampleRunDataRows: RunDataRow[] = [
  { id: 1, employeeCode: "EMP-001", employeeName: "สมหญิง ใจดี", baseSalary: 35000, presentDays: 21, absentDays: 0, otHours: 12, leaveDays: 1, missingScanDays: 0 },
  { id: 2, employeeCode: "EMP-002", employeeName: "วิทยา พรหม", baseSalary: 42000, presentDays: 19, absentDays: 1, otHours: 8, leaveDays: 2, missingScanDays: 2 },
  { id: 3, employeeCode: "EMP-003", employeeName: "กมลพร ศรีสุข", baseSalary: 28000, presentDays: 22, absentDays: 0, otHours: 4, leaveDays: 0, missingScanDays: 0 },
  { id: 4, employeeCode: "EMP-004", employeeName: "นพดล รัตน์", baseSalary: 52000, presentDays: 20, absentDays: 0, otHours: 15, leaveDays: 1, missingScanDays: 1 },
];

const sampleEmployeeSettings: EmployeeSettingRow[] = [
  {
    id: 1,
    employeeCode: "EMP-001",
    employeeName: "สมหญิง ใจดี",
    basicSalary: 35000,
    bankName: "SCB",
    bankAccountNo: "123-456-7890",
    taxDependent: 1,
    lifeInsuranceDeduction: 12000,
    ssoEnabled: true,
  },
  {
    id: 2,
    employeeCode: "EMP-002",
    employeeName: "วิทยา พรหม",
    basicSalary: 42000,
    bankName: "KTB",
    bankAccountNo: "111-222-3333",
    taxDependent: 2,
    lifeInsuranceDeduction: 15000,
    ssoEnabled: true,
  },
  {
    id: 3,
    employeeCode: "EMP-003",
    employeeName: "กมลพร ศรีสุข",
    basicSalary: 28000,
    bankName: "KTB",
    bankAccountNo: "444-555-6666",
    taxDependent: 0,
    lifeInsuranceDeduction: 8000,
    ssoEnabled: true,
  },
  {
    id: 4,
    employeeCode: "EMP-004",
    employeeName: "นพดล รัตน์",
    basicSalary: 52000,
    bankName: "BBL",
    bankAccountNo: "777-888-9999",
    taxDependent: 1,
    lifeInsuranceDeduction: 20000,
    ssoEnabled: true,
  },
];

export default function PayrollManagement() {
  const { hasRole } = useAuth();
  const { t } = useLanguage();
  const isHrCompany = hasRole(UserRole.HR_COMPANY);
  const isCentralHr = hasRole(UserRole.CENTRAL_HR);
  const isSystemAdmin = hasRole(UserRole.SUPER_ADMIN);
  const isReadOnly = isCentralHr || isSystemAdmin;

  const [selectedMonth, setSelectedMonth] = useState("2026-03");
  const [rows] = useState(samplePayrollRows);
  const [wizardStep, setWizardStep] = useState(1);
  const [lastSyncAt, setLastSyncAt] = useState("-");
  const [runRows, setRunRows] = useState<RunDataRow[]>(sampleRunDataRows);
  const [extraPayRows, setExtraPayRows] = useState<ExtraPayRow[]>(
    sampleRunDataRows.map((row) => ({
      id: row.id,
      commission: 0,
      travel: 1200,
      bonus: row.id === 2 ? 10000 : 0,
      lateDeduction: row.missingScanDays > 0 ? 500 : 0,
      loanDeduction: row.id === 4 ? 2000 : 0,
    }))
  );
  const [settingsRows, setSettingsRows] = useState<EmployeeSettingRow[]>(sampleEmployeeSettings);
  const [selectedSettingId, setSelectedSettingId] = useState<number>(sampleEmployeeSettings[0].id);
  const [reportDepartment, setReportDepartment] = useState("all");
  const [bankExportFormat, setBankExportFormat] = useState<BankExportFormat>("KTB_TXT");

  const currentRow = useMemo(() => rows.find((r) => r.month === selectedMonth) || rows[0], [rows, selectedMonth]);
  const previousRow = useMemo(() => rows.find((r) => r.month < selectedMonth) || rows[1] || rows[0], [rows, selectedMonth]);

  const trendRows = useMemo(
    () => [
      { label: "Last Month", total: previousRow?.netAmount || 0 },
      { label: "This Month", total: currentRow?.netAmount || 0 },
    ],
    [currentRow, previousRow]
  );

  const totalMissingScan = useMemo(() => runRows.reduce((sum, row) => sum + row.missingScanDays, 0), [runRows]);

  const payrollPreviewRows = useMemo(() => {
    return runRows.map((employee) => {
      const extra = extraPayRows.find((row) => row.id === employee.id) || {
        commission: 0,
        travel: 0,
        bonus: 0,
        lateDeduction: 0,
        loanDeduction: 0,
      };
      const otherIncome = extra.commission + extra.travel + extra.bonus;
      const otPay = employee.otHours * 220;
      const absentLateDeduction = extra.lateDeduction + extra.loanDeduction + employee.absentDays * 350;
      const sso = Math.min(employee.baseSalary * 0.05, 750);
      const wht = Math.max((employee.baseSalary + otherIncome + otPay - absentLateDeduction - sso) * 0.03, 0);
      const netPay = employee.baseSalary + otherIncome + otPay - absentLateDeduction - sso - wht;

      return {
        ...employee,
        otherIncome,
        otPay,
        absentLateDeduction,
        sso,
        wht,
        netPay,
      };
    });
  }, [extraPayRows, runRows]);

  const selectedSetting = useMemo(
    () => settingsRows.find((row) => row.id === selectedSettingId) || settingsRows[0],
    [selectedSettingId, settingsRows]
  );

  const updateExtraPay = (id: number, field: keyof ExtraPayRow, value: string) => {
    const numeric = Number(value || 0);
    setExtraPayRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: Number.isFinite(numeric) ? numeric : 0 } : row)));
  };

  const updateSelectedSetting = (field: keyof EmployeeSettingRow, value: string | boolean) => {
    setSettingsRows((prev) =>
      prev.map((row) => {
        if (row.id !== selectedSetting.id) return row;

        if (field === "basicSalary" || field === "taxDependent" || field === "lifeInsuranceDeduction") {
          const next = Number(value || 0);
          return { ...row, [field]: Number.isFinite(next) ? next : 0 };
        }

        return { ...row, [field]: value };
      })
    );
  };

  const runSyncData = () => {
    setLastSyncAt(new Date().toLocaleString());
    setRunRows((prev) =>
      prev.map((row) => ({
        ...row,
        otHours: row.otHours + (row.id % 2 === 0 ? 1 : 0),
      }))
    );
  };

  const monthDelta = (currentRow?.netAmount || 0) - (previousRow?.netAmount || 0);
  const monthDeltaPct = previousRow?.netAmount
    ? ((monthDelta / previousRow.netAmount) * 100).toFixed(2)
    : "0.00";

  const statusClassMap: Record<PayrollStatus, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-300",
    processing: "bg-blue-100 text-blue-700 border-blue-300",
    waiting_approval: "bg-amber-100 text-amber-800 border-amber-300",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-300",
  };

  const normalizeAccountNumber = (accountNo: string) => String(accountNo || "").replace(/\D/g, "");

  const downloadTextFile = (fileName: string, text: string, mimeType: string) => {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8;` });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const getExportRows = () => {
    return payrollPreviewRows
      .filter((row) => row.netPay > 0)
      .map((row) => {
        const setting = settingsRows.find((s) => s.id === row.id);
        return {
          employeeCode: row.employeeCode,
          employeeName: row.employeeName,
          bankName: setting?.bankName || "SCB",
          bankAccountNo: normalizeAccountNumber(setting?.bankAccountNo || "0000000000"),
          amount: Number(Math.max(0, row.netPay).toFixed(2)),
          paymentDate: currentRow?.paymentDate || "",
        };
      });
  };

  const handleGenerateBankFile = () => {
    const exportRows = getExportRows();
    if (exportRows.length === 0) {
      window.alert("No payable employee rows to export");
      return;
    }

    const totalAmount = exportRows.reduce((sum, row) => sum + row.amount, 0).toFixed(2);
    const monthToken = (selectedMonth || "").replace("-", "");

    if (bankExportFormat === "KTB_TXT") {
      const header = `H|KTB|${currentRow?.paymentDate || ""}|${exportRows.length}|${totalAmount}`;
      const details = exportRows.map((row, index) => {
        const amountNoDot = row.amount.toFixed(2).replace(".", "").padStart(13, "0");
        return `D|${String(index + 1).padStart(6, "0")}|${row.bankAccountNo.padEnd(15, " ")}|${amountNoDot}|${row.employeeName}`;
      });
      const trailer = `T|${exportRows.length}|${totalAmount}`;
      downloadTextFile(`payroll-ktb-${monthToken}.txt`, [header, ...details, trailer].join("\n"), "text/plain");
      return;
    }

    const csvHeader = bankExportFormat === "SCB_CSV"
      ? "Seq,PaymentDate,AccountNo,BankCode,Amount,AccountName,Reference"
      : "Seq,PaymentDate,EmployeeCode,EmployeeName,BankName,AccountNo,Amount";

    const bankCodeMap: Record<string, string> = {
      SCB: "014",
      KTB: "006",
      BBL: "002",
      KBANK: "004",
      BAY: "025",
      TTB: "011",
    };

    const csvRows = exportRows.map((row, index) => {
      if (bankExportFormat === "SCB_CSV") {
        const bankCode = bankCodeMap[row.bankName.toUpperCase()] || "000";
        return [
          index + 1,
          row.paymentDate,
          row.bankAccountNo,
          bankCode,
          row.amount.toFixed(2),
          `"${row.employeeName}"`,
          `PAYROLL-${monthToken}`,
        ].join(",");
      }

      return [
        index + 1,
        row.paymentDate,
        row.employeeCode,
        `"${row.employeeName}"`,
        row.bankName,
        row.bankAccountNo,
        row.amount.toFixed(2),
      ].join(",");
    });

    const csvContent = [csvHeader, ...csvRows].join("\n");
    const filePrefix = bankExportFormat === "SCB_CSV" ? "payroll-scb" : "payroll-generic";
    downloadTextFile(`${filePrefix}-${monthToken}.csv`, csvContent, "text/csv");
  };

  const handleExportDraftExcel = () => {
    const exportRows = payrollPreviewRows.map((row) => {
      const setting = settingsRows.find((s) => s.id === row.id);
      return {
        Month: selectedMonth,
        EmployeeCode: row.employeeCode,
        EmployeeName: row.employeeName,
        BankName: setting?.bankName || "",
        BankAccountNo: normalizeAccountNumber(setting?.bankAccountNo || ""),
        BaseSalary: row.baseSalary,
        OtherIncome: row.otherIncome,
        OTPay: row.otPay,
        AbsentLateDeduction: row.absentLateDeduction,
        SSO: row.sso,
        WHT: row.wht,
        NetPay: Number(Math.max(0, row.netPay).toFixed(2)),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PayrollDraft");
    XLSX.writeFile(workbook, `payroll-draft-${selectedMonth.replace("-", "")}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t("payroll.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{isHrCompany ? t("payroll.descriptionManage") : t("payroll.descriptionReadOnly")}</p>
          </div>
          <Badge variant="outline">
            {isHrCompany ? t("payroll.badge.hrCompany") : isCentralHr ? t("payroll.badge.centralHr") : t("payroll.badge.systemAdmin")}
          </Badge>
        </CardHeader>
        <CardContent>
          {isReadOnly ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">{t("payroll.readOnlyNotice")}</p>
          ) : null}

          <Tabs defaultValue="overview">
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Payroll Overview</TabsTrigger>
              <TabsTrigger value="run" disabled={isReadOnly}>Run Payroll Wizard</TabsTrigger>
              <TabsTrigger value="settings">Employee Payroll Settings</TabsTrigger>
              <TabsTrigger value="reports">Payroll Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-0 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t("payroll.fields.month")}</p>
                  <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                </div>
                <Card className="border-border/70">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Net Pay</p>
                    <p className="text-xl font-semibold mt-1">{(currentRow?.netAmount || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/70">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Employees</p>
                    <p className="text-xl font-semibold mt-1">{currentRow?.employees || 0}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/70">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Payment Date</p>
                    <p className="text-xl font-semibold mt-1">{currentRow?.paymentDate || "-"}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/70">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className={`mt-2 ${statusClassMap[currentRow?.status || "draft"]}`}>
                      {t(`payroll.status.${currentRow?.status || "draft"}`, currentRow?.status || "draft")}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="shadow-card lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Payroll Cost Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendRows}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 text-sm">
                      <span className={monthDelta >= 0 ? "text-amber-700" : "text-emerald-700"}>
                        {monthDelta >= 0 ? "+" : ""}
                        {monthDelta.toLocaleString()} ({monthDeltaPct}%)
                      </span>
                      <span className="text-muted-foreground ml-2">vs previous month</span>
                    </div>
                    {currentRow?.note ? <p className="text-xs text-muted-foreground mt-1">{currentRow.note}</p> : null}
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-base">Current Month Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">OT</span><span>{(currentRow?.otAmount || 0).toLocaleString()}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Allowances</span><span>{(currentRow?.allowanceAmount || 0).toLocaleString()}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Deductions</span><span>{(currentRow?.deductionAmount || 0).toLocaleString()}</span></div>
                    <div className="border-t pt-2 flex items-center justify-between font-semibold"><span>Net</span><span>{(currentRow?.netAmount || 0).toLocaleString()}</span></div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-card overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-base">Recent Payroll Cycles</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Month</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Employees</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.month} className="border-b last:border-b-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs">{row.month}</td>
                          <td className="px-4 py-3">{row.company}</td>
                          <td className="px-4 py-3 text-right">{row.employees}</td>
                          <td className="px-4 py-3 text-right">{row.netAmount.toLocaleString()}</td>
                          <td className="px-4 py-3">{row.paymentDate}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={statusClassMap[row.status]}>{t(`payroll.status.${row.status}`, row.status)}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Button size="sm" variant="outline" onClick={() => setSelectedMonth(row.month)}>View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="run" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Run Payroll Wizard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((step) => (
                      <button
                        key={step}
                        type="button"
                        className={`rounded-md border px-3 py-2 text-sm text-left ${wizardStep === step ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}
                        onClick={() => setWizardStep(step)}
                      >
                        <p className="font-medium">Step {step}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {step === 1 ? "Sync & Verify" : step === 2 ? "Allowances & Deductions" : step === 3 ? "Pre-Calculation Review" : "Approve & Generate"}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {wizardStep === 1 ? (
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Step 1: Sync & Verify Data</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Last sync: {lastSyncAt}</p>
                    </div>
                    <Button onClick={runSyncData}>Sync Data</Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {totalMissingScan > 0 ? (
                      <div className="m-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        พบข้อมูลต้องแก้ไข: Missing scan รวม {totalMissingScan} วัน
                      </div>
                    ) : null}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                          <th className="text-center px-4 py-3 font-medium text-muted-foreground">Present</th>
                          <th className="text-center px-4 py-3 font-medium text-muted-foreground">Absent</th>
                          <th className="text-center px-4 py-3 font-medium text-muted-foreground">OT Hours</th>
                          <th className="text-center px-4 py-3 font-medium text-muted-foreground">Leave Days</th>
                          <th className="text-center px-4 py-3 font-medium text-muted-foreground">Missing Scan</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alert</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runRows.map((row) => (
                          <tr key={row.id} className={`border-b last:border-b-0 ${row.missingScanDays > 0 ? "bg-destructive/5" : ""}`}>
                            <td className="px-4 py-3">{row.employeeCode} - {row.employeeName}</td>
                            <td className="px-4 py-3 text-center">{row.presentDays}</td>
                            <td className="px-4 py-3 text-center">{row.absentDays}</td>
                            <td className="px-4 py-3 text-center">{row.otHours}</td>
                            <td className="px-4 py-3 text-center">{row.leaveDays}</td>
                            <td className="px-4 py-3 text-center">{row.missingScanDays}</td>
                            <td className="px-4 py-3 text-xs">
                              {row.missingScanDays > 0 ? "ขาดข้อมูลสแกนนิ้ว ต้องแก้ก่อนรัน" : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ) : null}

              {wizardStep === 2 ? (
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Step 2: Allowances & Deductions</CardTitle>
                    <Button variant="outline">Import Excel</Button>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm min-w-[960px]">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Commission</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Travel</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bonus</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Late Deduction</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Loan Deduction</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runRows.map((employee) => {
                          const extra = extraPayRows.find((row) => row.id === employee.id);
                          if (!extra) return null;

                          return (
                            <tr key={employee.id} className="border-b last:border-b-0">
                              <td className="px-4 py-3">{employee.employeeCode} - {employee.employeeName}</td>
                              <td className="px-4 py-3"><Input type="number" value={extra.commission} onChange={(e) => updateExtraPay(employee.id, "commission", e.target.value)} className="text-right" /></td>
                              <td className="px-4 py-3"><Input type="number" value={extra.travel} onChange={(e) => updateExtraPay(employee.id, "travel", e.target.value)} className="text-right" /></td>
                              <td className="px-4 py-3"><Input type="number" value={extra.bonus} onChange={(e) => updateExtraPay(employee.id, "bonus", e.target.value)} className="text-right" /></td>
                              <td className="px-4 py-3"><Input type="number" value={extra.lateDeduction} onChange={(e) => updateExtraPay(employee.id, "lateDeduction", e.target.value)} className="text-right" /></td>
                              <td className="px-4 py-3"><Input type="number" value={extra.loanDeduction} onChange={(e) => updateExtraPay(employee.id, "loanDeduction", e.target.value)} className="text-right" /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ) : null}

              {wizardStep === 3 ? (
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Step 3: Pre-Calculation Review</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline">Recalculate</Button>
                      <Button variant="outline" onClick={handleExportDraftExcel}>Export Draft</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm min-w-[1280px]">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base Salary</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">+Other Income</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">+OT</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">-Absent/Late</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">-SSO</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">-WHT</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payrollPreviewRows.map((row) => (
                          <tr key={row.id} className="border-b last:border-b-0">
                            <td className="px-4 py-3">{row.employeeName}</td>
                            <td className="px-4 py-3 text-right">{row.baseSalary.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{row.otherIncome.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{row.otPay.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{row.absentLateDeduction.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{row.sso.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">{row.wht.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right font-semibold">{Math.max(0, row.netPay).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ) : null}

              {wizardStep === 4 ? (
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-base">Step 4: Approve & Generate</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-md border bg-muted/20 p-4">
                        <p className="text-xs text-muted-foreground">Total Net Pay</p>
                        <p className="text-lg font-semibold mt-1">{payrollPreviewRows.reduce((sum, row) => sum + Math.max(0, row.netPay), 0).toLocaleString()}</p>
                      </div>
                      <div className="rounded-md border bg-muted/20 p-4">
                        <p className="text-xs text-muted-foreground">Employees</p>
                        <p className="text-lg font-semibold mt-1">{payrollPreviewRows.length}</p>
                      </div>
                      <div className="rounded-md border bg-muted/20 p-4">
                        <p className="text-xs text-muted-foreground">Payment Date</p>
                        <p className="text-lg font-semibold mt-1">{currentRow?.paymentDate || "-"}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={bankExportFormat}
                          onChange={(e) => setBankExportFormat(e.target.value as BankExportFormat)}
                        >
                          <option value="KTB_TXT">KTB TXT</option>
                          <option value="SCB_CSV">SCB CSV</option>
                          <option value="GENERIC_CSV">Generic CSV</option>
                        </select>
                        <Button className="min-w-[200px]" onClick={handleGenerateBankFile}>Generate Bank File</Button>
                      </div>
                      <Button className="min-w-[200px]" variant="outline">Generate Payslips</Button>
                      <Button className="min-w-[200px]" variant="outline">Publish Payslips</Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              <div className="flex items-center justify-between">
                <Button variant="outline" disabled={wizardStep === 1} onClick={() => setWizardStep((s) => Math.max(1, s - 1))}>Back</Button>
                <Button disabled={wizardStep === 4} onClick={() => setWizardStep((s) => Math.min(4, s + 1))}>Next</Button>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Employee Payroll Settings</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Employee</p>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedSettingId}
                      onChange={(e) => setSelectedSettingId(Number(e.target.value))}
                    >
                      {settingsRows.map((row) => (
                        <option key={row.id} value={row.id}>{row.employeeCode} - {row.employeeName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    {selectedSetting.employeeName} ({selectedSetting.employeeCode})
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Basic Salary</p>
                    <Input type="number" value={selectedSetting.basicSalary} onChange={(e) => updateSelectedSetting("basicSalary", e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Bank Name</p>
                    <Input value={selectedSetting.bankName} onChange={(e) => updateSelectedSetting("bankName", e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Bank Account No.</p>
                    <Input value={selectedSetting.bankAccountNo} onChange={(e) => updateSelectedSetting("bankAccountNo", e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tax Dependent (children)</p>
                    <Input type="number" value={selectedSetting.taxDependent} onChange={(e) => updateSelectedSetting("taxDependent", e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Life Insurance Deduction</p>
                    <Input type="number" value={selectedSetting.lifeInsuranceDeduction} onChange={(e) => updateSelectedSetting("lifeInsuranceDeduction", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id="sso-enabled"
                      type="checkbox"
                      checked={selectedSetting.ssoEnabled}
                      onChange={(e) => updateSelectedSetting("ssoEnabled", e.target.checked)}
                    />
                    <label htmlFor="sso-enabled" className="text-sm">Enable SSO Deduction</label>
                  </div>

                  <div className="lg:col-span-2 flex justify-end">
                    <Button>Save Payroll Setting</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-base">Payroll Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Month</p>
                      <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Department</p>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={reportDepartment}
                        onChange={(e) => setReportDepartment(e.target.value)}
                      >
                        <option value="all">All Departments</option>
                        <option value="hr">HR</option>
                        <option value="it">IT</option>
                        <option value="accounting">Accounting</option>
                        <option value="operations">Operations</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button variant="outline" className="justify-start">Download Payroll Summary Report</Button>
                    <Button variant="outline" className="justify-start">Download P.N.D. 1 (WHT)</Button>
                    <Button variant="outline" className="justify-start">Download SSO 1-10 Report</Button>
                    <Button variant="outline" className="justify-start">Download OT by Cost Center</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
