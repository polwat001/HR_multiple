import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Download, Users, Clock, TrendingUp, CalendarCheck2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/lib/api";
import { resolveRoleViewKey } from "@/lib/accessMatrix";
import { useLanguage } from "@/contexts/LanguageContext";

const reports = [
  { id: "employee-list", icon: Users },
  { id: "attendance-summary", icon: Clock },
  { id: "ot-monthly", icon: TrendingUp },
  { id: "leave-usage", icon: CalendarCheck2 },
];

type FilterOption = {
  value: string;
  label: string;
};

const employeeStatuses = [
  { value: "all" },
  { value: "active" },
  { value: "resigned" },
];

const Reports = () => {
  const { user: authUser } = useAuth();
  const { t } = useLanguage();
  const roleViewKey = resolveRoleViewKey(authUser as any);
  const isEmployeeReports = roleViewKey === "employee";
  const isManagerReports = roleViewKey === "manager";
  const isCompanyReports = roleViewKey === "hr_company";
  const isHoldingReports = roleViewKey === "central_hr" || roleViewKey === "super_admin";
  const ownUserId = Number((authUser as any)?.user_id || 0);
  const [scope, setScope] = useState("all");
  const [format, setFormat] = useState("excel");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [employeeStatus, setEmployeeStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyOptions, setCompanyOptions] = useState<FilterOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<FilterOption[]>([]);
  const [employeeSummaryLoading, setEmployeeSummaryLoading] = useState(false);
  const [employeeSummary, setEmployeeSummary] = useState({
    attendanceRecords: 0,
    lateCount: 0,
    absentCount: 0,
    otHours: 0,
    pendingLeave: 0,
    approvedLeave: 0,
    remainingLeave: 0,
  });

  const visibleReports = isEmployeeReports
    ? reports.filter((r) => r.id === "attendance-summary" || r.id === "ot-monthly" || r.id === "leave-usage")
    : isManagerReports
      ? reports.filter((r) => r.id === "attendance-summary" || r.id === "ot-monthly" || r.id === "leave-usage")
      : reports;

  const exportLabel = format === "pdf" ? t("reports.exportPdf") : t("reports.exportXlsx");

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [companiesRes, departmentsRes] = await Promise.all([
          apiGet<any>("/organization/companies"),
          apiGet<any>("/organization/departments"),
        ]);

        const companyRows = Array.isArray(companiesRes) ? companiesRes : companiesRes?.data || [];
        const departmentRows = Array.isArray(departmentsRes) ? departmentsRes : departmentsRes?.data || [];

        const nextCompanyOptions: FilterOption[] = [
          { value: "all", label: t("reports.filters.companies.all") },
          ...companyRows.map((company: any) => ({
            value: String(company?.code || company?.id || "all").toLowerCase(),
            label: String(company?.name_th || company?.name || company?.code || "-").trim(),
          })),
        ];

        const nextDepartmentOptions: FilterOption[] = [
          { value: "all", label: t("reports.filters.departments.all") },
          ...departmentRows.map((department: any) => {
            const name = String(department?.name_th || department?.name || department?.code || "-").trim();
            return {
              value: name.toLowerCase(),
              label: name,
            };
          }),
        ];

        setCompanyOptions(nextCompanyOptions);
        setDepartmentOptions(nextDepartmentOptions);
      } catch (error) {
        console.error("Failed to fetch report filter options:", error);
        setCompanyOptions([{ value: "all", label: t("reports.filters.companies.all") }]);
        setDepartmentOptions([{ value: "all", label: t("reports.filters.departments.all") }]);
      }
    };

    fetchFilterOptions();
  }, [t]);

  const filterManagerTeamRows = useCallback(
    <T extends Record<string, any>>(rows: T[]): T[] => {
      if (!isManagerReports || !ownUserId) return rows;
      return rows.filter((row) => Number(row?.user_id || 0) !== ownUserId);
    },
    [isManagerReports, ownUserId]
  );

  const buildDateQuery = useCallback(() => {
    const query = new URLSearchParams({
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    }).toString();
    return query ? `?${query}` : "";
  }, [dateFrom, dateTo]);

  const fetchEmployeeSummary = useCallback(async () => {
    try {
      setEmployeeSummaryLoading(true);
      const dateQuery = buildDateQuery();

      const [attendanceRes, otRes, leaveReqRes, leaveBalanceRes] = await Promise.all([
        apiGet<any>(`/reports/attendance${dateQuery}`),
        apiGet<any>(`/reports/ot${dateQuery}`),
        apiGet<any>("/leaves/requests"),
        apiGet<any>("/leaves/balances"),
      ]);

      const attendanceRows = filterManagerTeamRows(Array.isArray(attendanceRes) ? attendanceRes : attendanceRes?.data || []);
      const otRows = filterManagerTeamRows(Array.isArray(otRes) ? otRes : otRes?.data || []);
      const leaveReqRows = filterManagerTeamRows(Array.isArray(leaveReqRes) ? leaveReqRes : leaveReqRes?.data || []);
      const leaveBalanceRows = filterManagerTeamRows(Array.isArray(leaveBalanceRes) ? leaveBalanceRes : leaveBalanceRes?.data || []);

      const lateCount = attendanceRows.filter((r: any) => String(r.status || "").toLowerCase() === "late").length;
      const absentCount = attendanceRows.filter((r: any) => String(r.status || "").toLowerCase() === "absent").length;
      const otHours = otRows.reduce((sum: number, row: any) => sum + Number(row.total_hours || 0), 0);
      const pendingLeave = leaveReqRows.filter((r: any) => String(r.status || "").toLowerCase() === "pending").length;
      const approvedLeave = leaveReqRows.filter((r: any) => String(r.status || "").toLowerCase() === "approved").length;
      const remainingLeave = leaveBalanceRows.reduce((sum: number, row: any) => sum + Number(row.balance || 0), 0);

      setEmployeeSummary({
        attendanceRecords: attendanceRows.length,
        lateCount,
        absentCount,
        otHours,
        pendingLeave,
        approvedLeave,
        remainingLeave,
      });
    } catch (error) {
      console.error("Failed to fetch employee report summary:", error);
    } finally {
      setEmployeeSummaryLoading(false);
    }
  }, [buildDateQuery]);

  useEffect(() => {
    if (!isEmployeeReports) return;

    fetchEmployeeSummary();
  }, [fetchEmployeeSummary, isEmployeeReports]);

  const getSummaryBadge = (key: string, value: number) => {
    if (key === "late") {
      if (value >= 4) return { label: t("reports.badge.high"), className: "bg-red-100 text-red-700 border-red-300" };
      if (value >= 1) return { label: t("reports.badge.watch"), className: "bg-amber-100 text-amber-700 border-amber-300" };
      return { label: t("reports.badge.normal"), className: "bg-emerald-100 text-emerald-700 border-emerald-300" };
    }

    if (key === "absent") {
      if (value >= 2) return { label: t("reports.badge.high"), className: "bg-red-100 text-red-700 border-red-300" };
      if (value === 1) return { label: t("reports.badge.watch"), className: "bg-amber-100 text-amber-700 border-amber-300" };
      return { label: t("reports.badge.normal"), className: "bg-emerald-100 text-emerald-700 border-emerald-300" };
    }

    if (key === "leavePending") {
      if (value >= 3) return { label: t("reports.badge.longPending"), className: "bg-amber-100 text-amber-700 border-amber-300" };
      return { label: t("reports.badge.normal"), className: "bg-emerald-100 text-emerald-700 border-emerald-300" };
    }

    return null;
  };

  const employeeSummaryCards = useMemo(
    () => [
      { key: "attendance", label: t("reports.summary.attendanceRecords"), value: employeeSummary.attendanceRecords },
      { key: "late", label: t("reports.summary.late"), value: employeeSummary.lateCount },
      { key: "absent", label: t("reports.summary.absent"), value: employeeSummary.absentCount },
      { key: "ot", label: t("reports.summary.otHours"), value: employeeSummary.otHours },
      { key: "leavePending", label: t("reports.summary.pendingLeave"), value: employeeSummary.pendingLeave },
      { key: "leaveRemain", label: t("reports.summary.remainingLeave"), value: employeeSummary.remainingLeave },
    ],
    [employeeSummary, t]
  );

  const handleExport = async (reportId: string, reportName: string, forcedFormat?: "excel" | "pdf") => {
    const selectedFormat = forcedFormat || (format as "excel" | "pdf");
    const selectedCompany =
      isEmployeeReports || isManagerReports || isCompanyReports
        ? "current"
        : companyFilter || scope;
    const payload = {
      reportId,
      reportName,
      format: selectedFormat,
      company: selectedCompany,
      department: departmentFilter,
      dateFrom,
      dateTo,
      employeeStatus,
      scope: isHoldingReports ? scope : "current",
    };

    let apiRows: any[] | null = null;
    try {
      if (reportId === "employee-list") {
        const res = await apiGet<any>("/employees");
        apiRows = filterManagerTeamRows(Array.isArray(res) ? res : res?.data || []);
      }

      if (reportId === "attendance-summary") {
        const query = new URLSearchParams({
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
          ...(departmentFilter ? { department: departmentFilter } : {}),
          ...(employeeStatus ? { employee_status: employeeStatus } : {}),
        }).toString();
        const res = await apiGet<any>(`/reports/attendance${query ? `?${query}` : ""}`);
        apiRows = filterManagerTeamRows(Array.isArray(res) ? res : res?.data || []);
      }

      if (reportId === "ot-monthly") {
        const query = new URLSearchParams({
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
          ...(departmentFilter ? { department: departmentFilter } : {}),
          ...(employeeStatus ? { employee_status: employeeStatus } : {}),
        }).toString();
        const res = await apiGet<any>(`/reports/ot${query ? `?${query}` : ""}`);
        apiRows = filterManagerTeamRows(Array.isArray(res) ? res : res?.data || []);
      }

      if (reportId === "leave-usage") {
        const [requestRes, balanceRes] = await Promise.all([
          apiGet<any>("/leaves/requests"),
          apiGet<any>("/leaves/balances"),
        ]);
        const requestRows = filterManagerTeamRows(Array.isArray(requestRes) ? requestRes : requestRes?.data || []);
        const balanceRows = filterManagerTeamRows(Array.isArray(balanceRes) ? balanceRes : balanceRes?.data || []);
        const requestPayload = requestRows.map((row: any) => ({
          user_id: row.user_id,
          type: "request",
          leave_type_name: row.leave_type_name,
          start_date: row.start_date,
          end_date: row.end_date,
          total_days: row.total_days,
          status: row.status,
          reason: row.reason,
        }));
        const balancePayload = balanceRows.map((row: any) => ({
          user_id: row.user_id,
            type: "balance",
            leave_type_name: row.leave_type_name,
            quota: row.quota,
            used: row.used,
            pending: row.pending,
            balance: row.balance,
          }));

        apiRows = [...requestPayload, ...balancePayload];
      }
    } catch (error) {
      console.error("Report API export failed:", error);
      alert(t("reports.fetchFailed"));
      return;
    }

    const exportBody = {
      ...payload,
      rows: apiRows,
      generatedAt: new Date().toISOString(),
    };

    if (reportId === "employee-list" && selectedFormat === "excel") {
      const rows = apiRows || [];
      const header = ["employee_code", "firstname_th", "lastname_th", "company_name", "department_name", "position_name", "status"];
      const csv = [
        header.join(","),
        ...rows.map((r: any) =>
          header
            .map((key) => {
              const value = String(r?.[key] ?? "").replaceAll('"', '""');
              return `"${value}"`;
            })
            .join(",")
        ),
      ].join("\n");

      const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const csvUrl = URL.createObjectURL(csvBlob);
      const csvAnchor = document.createElement("a");
      csvAnchor.href = csvUrl;
      csvAnchor.download = `employee-list-${new Date().toISOString().slice(0, 10)}.csv`;
      csvAnchor.click();
      URL.revokeObjectURL(csvUrl);
      return;
    }

    const content = JSON.stringify(exportBody, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${reportId}-${selectedFormat === "pdf" ? "pdf" : "xlsx"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isEmployeeReports) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="shadow-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("reports.myDashboardTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{t("reports.myDashboardSubtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{t("reports.employeeScope")}</Badge>
              <Button variant="outline" size="sm" onClick={fetchEmployeeSummary} disabled={employeeSummaryLoading}>
                {employeeSummaryLoading ? t("reports.refreshing") : t("reports.refreshSummary")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("reports.dateFrom")}</p>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t("reports.dateTo")}</p>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => handleExport("attendance-summary", t("reports.catalog.attendance-summary.name"), "excel")}>
                <Download className="h-4 w-4" /> {t("reports.exportAttendance")}
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => handleExport("ot-monthly", t("reports.catalog.ot-monthly.name"), "excel")}>
                <Download className="h-4 w-4" /> {t("reports.exportOt")}
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => handleExport("leave-usage", t("reports.catalog.leave-usage.name"), "excel")}>
                <Download className="h-4 w-4" /> {t("reports.exportLeave")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-0 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employeeSummaryCards.map((card) => (
            <Card key={card.key} className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  {getSummaryBadge(card.key, Number(card.value)) ? (
                    <Badge
                      variant="outline"
                      className={getSummaryBadge(card.key, Number(card.value))?.className}
                    >
                      {getSummaryBadge(card.key, Number(card.value))?.label}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-2xl font-bold mt-1">
                  {employeeSummaryLoading ? "..." : card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">{t("reports.availablePersonal")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleReports.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <r.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t(`reports.catalog.${r.id}.name`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`reports.catalog.${r.id}.description`)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport(r.id, t(`reports.catalog.${r.id}.name`), "excel")}>{t("reports.exportXlsx")}</Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport(r.id, t(`reports.catalog.${r.id}.name`), "pdf")}>{t("reports.exportPdf")}</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("reports.filters.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("reports.filters.company")}</p>
            {isEmployeeReports || isManagerReports || isCompanyReports ? (
              <div className="h-10 rounded-md border border-input px-3 flex items-center text-sm bg-muted/30">{t("reports.currentCompany")}</div>
            ) : (
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                {companyOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("reports.filters.department")}</p>
            {isEmployeeReports ? (
              <div className="h-10 rounded-md border border-input px-3 flex items-center text-sm bg-muted/30">{t("reports.myDepartment")}</div>
            ) : (
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                {departmentOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("reports.dateFrom")}</p>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("reports.dateTo")}</p>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("reports.filters.employeeStatus")}</p>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={employeeStatus}
              onChange={(e) => setEmployeeStatus(e.target.value)}
            >
              {employeeStatuses.map((item) => (
                <option key={item.value} value={item.value}>{t(`reports.filters.statuses.${item.value}`)}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report List */}
        <div className="lg:col-span-2 space-y-3">
          {visibleReports.map((r) => (
            <Card key={r.id} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{t(`reports.catalog.${r.id}.name`)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(`reports.catalog.${r.id}.description`)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport(r.id, t(`reports.catalog.${r.id}.name`), "excel")}>
                    <Download className="h-4 w-4" /> {t("reports.exportXlsx")}
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport(r.id, t(`reports.catalog.${r.id}.name`), "pdf")}>
                    <Download className="h-4 w-4" /> {t("reports.exportPdf")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Generate Options */}
        <Card className="shadow-card h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> {t("reports.generateOptions.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-3">{t("reports.generateOptions.scope")}</p>
              {isEmployeeReports ? (
                <div className="text-sm rounded-md border border-border p-3 bg-muted/30">
                  {t("reports.scope.myDataOnly")}
                </div>
              ) : isManagerReports ? (
                <div className="text-sm rounded-md border border-border p-3 bg-muted/30">
                  {t("reports.scope.teamOnly")}
                </div>
              ) : isCompanyReports ? (
                <div className="text-sm rounded-md border border-border p-3 bg-muted/30">
                  {t("reports.scope.currentCompanyOnly")}
                </div>
              ) : (
                <RadioGroup value={scope} onValueChange={setScope} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="current" id="scope-current" />
                    <Label htmlFor="scope-current" className="text-sm">{t("reports.scope.currentCompanyOnly")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="scope-all" />
                    <Label htmlFor="scope-all" className="text-sm">{t("reports.scope.allCompanies")}</Label>
                  </div>
                </RadioGroup>
              )}
            </div>
            <div>
              <p className="text-sm font-medium mb-3">{t("reports.generateOptions.format")}</p>
              <RadioGroup value={format} onValueChange={setFormat} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="fmt-excel" />
                  <Label htmlFor="fmt-excel" className="text-sm">{t("reports.generateOptions.excel")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="fmt-pdf" />
                  <Label htmlFor="fmt-pdf" className="text-sm">{t("reports.generateOptions.pdf")}</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              {isHoldingReports
                ? t("reports.generateOptions.holdingHint")
                : format === "pdf" && scope === "current"
                ? t("reports.generateOptions.pdfCompanyHint")
                : format === "pdf" && scope === "all"
                ? t("reports.generateOptions.pdfGroupHint")
                : t("reports.generateOptions.excelHint")}
            </div>
            <Button
              className="w-full gap-1.5"
              onClick={() => handleExport("bulk-export", t("reports.bulkExportName"))}
            >
              <Download className="h-4 w-4" /> {exportLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
