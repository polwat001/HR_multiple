import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, Settings, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { resolveRoleViewKey } from "@/lib/accessMatrix";
import { useLanguage } from "@/contexts/LanguageContext";

type LeaveTypeOption = { id: number; name: string; leaveTypeCode: string };
type LeavePolicyRow = {
  company_id: number;
  company_code: string;
  company_name: string;
  service_years: number;
  vacation_days: number;
  sick_cert_required_after_days: number;
};
type HolidayRow = { id: number; holiday_date: string; holiday_name_th: string };

const inferLeaveTypeCode = (code?: string, name?: string, id?: number) => {
  const normalizedCode = String(code || "").trim().toLowerCase();
  if (normalizedCode) return normalizedCode;

  const normalizedName = String(name || "").trim().toLowerCase();
  if (normalizedName.includes("vacation") || normalizedName.includes("annual") || normalizedName.includes("พักร้อน") || normalizedName.includes("พักผ่อน")) return "annual";
  if (normalizedName.includes("sick") || normalizedName.includes("ป่วย")) return "sick";
  if (normalizedName.includes("personal") || normalizedName.includes("กิจ")) return "personal";
  if (normalizedName.includes("maternity") || normalizedName.includes("คลอด")) return "maternity";
  return `custom_${Number(id || 0)}`;
};

const LeaveManagement = () => {
  const { t } = useLanguage();
  const { hasPermission, hasRole, user } = useAuth();
  const roleViewKey = resolveRoleViewKey(user as any);
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);
  const isManagerView = roleViewKey === "manager";
  const ownUserId = Number((user as any)?.user_id || 0);
  const canRequestLeave = hasPermission(Permission.REQUEST_LEAVE);
  const canManageLeave = hasPermission(Permission.APPROVE_DEPARTMENT_LEAVE) || hasPermission(Permission.MANAGE_COMPANY_LEAVE) || hasPermission(Permission.MANAGE_ALL_LEAVE);
  const canApproveLeaveTransactions = canManageLeave && !isSuperAdmin;
  const canManageLeavePolicy = hasPermission(Permission.MANAGE_COMPANY_LEAVE) || hasPermission(Permission.MANAGE_ALL_LEAVE);
  const canManageHoliday = hasPermission(Permission.MANAGE_COMPANY_HOLIDAYS) || hasPermission(Permission.MANAGE_ALL_HOLIDAYS);
  const isEmployeeOnly = canRequestLeave && !canManageLeave;
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<LeaveTypeOption[]>([]);
  const [policyRows, setPolicyRows] = useState<LeavePolicyRow[]>([]);
  const [holidays, setHolidays] = useState<HolidayRow[]>([]);
  const [policySaving, setPolicySaving] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    totalDays: "",
    reason: "",
    attachmentName: "",
  });
  const [showEmployeeRequestForm, setShowEmployeeRequestForm] = useState(false);
  const [employeeView, setEmployeeView] = useState<"history" | "request">("history");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7));

  const getLeaveTypeLabel = (code?: string, fallbackName?: string, id?: number) => {
    const leaveTypeCode = inferLeaveTypeCode(code, fallbackName, id);
    const key = `leaveManagement.leaveTypeCodes.${leaveTypeCode}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return fallbackName || t("leaveManagement.common.unknown");
  };

  const getStatusLabel = (status?: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") return t("leaveManagement.status.approved");
    if (s === "pending") return t("leaveManagement.status.pending");
    if (s === "rejected") return t("leaveManagement.status.rejected");
    return status || t("leaveManagement.common.na");
  };

  const getStatusClass = (status?: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") return "rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "pending") return "rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm bg-amber-50 text-amber-700 border-amber-200";
    if (s === "rejected") return "rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm bg-red-50 text-red-700 border-red-200";
    return ""; 
  };

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        setLoadingRequests(true);
        const res = await apiGet<any>("/leaves/requests");
        const rows = Array.isArray(res) ? res : res?.data || [];
        setRequests(rows);
      } catch (error) {
        console.error("Failed to fetch leave requests:", error);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchLeaveRequests();
  }, []); 
  

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const res = await apiGet<any>("/leaves/balances");
        setBalances(Array.isArray(res) ? res : res?.data || []);
      } catch (error) {
        console.error("Failed to fetch leave balances:", error);
      }
    };

    fetchBalances();
  }, []);

  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const res = await apiGet<any>("/leaves/types");
        const rows = Array.isArray(res) ? res : res?.data || [];
        setLeaveTypeOptions(
          rows.map((row: any) => ({
            id: Number(row.id),
            name: String(row.name || `Type ${row.id}`),
            leaveTypeCode: inferLeaveTypeCode(row.leave_type_code, row.name, row.id),
          }))
        );
      } catch (error) {
        console.error("Failed to fetch leave types:", error);
      }
    };

    fetchLeaveTypes();
  }, []); 


  useEffect(() => {
    if (!canManageLeavePolicy) return;

    const fetchPolicies = async () => {
      try {
        const res = await apiGet<any>("/admin/leave-policies");
        const rows = Array.isArray(res) ? res : res?.data || [];
        setPolicyRows(
          rows.map((row: any) => ({
            company_id: Number(row.company_id),
            company_code: String(row.company_code || ""),
            company_name: String(row.company_name || "-"),
            service_years: Number(row.service_years || 0),
            vacation_days: Number(row.vacation_days || 0),
            sick_cert_required_after_days: Number(row.sick_cert_required_after_days || 0),
          }))
        );
      } catch (error) {
        console.error("Failed to fetch leave policies:", error);
      }
    };

    fetchPolicies();
  }, [canManageLeavePolicy]);

  const fetchHolidays = useCallback(async () => {
    if (!canManageHoliday) return;
    try {
      const res = await apiGet<any>("/holidays");
      const rows = Array.isArray(res) ? res : res?.data || [];
      setHolidays(
        rows.map((row: any) => ({
          id: Number(row.id),
          holiday_date: String(row.holiday_date || row.date || ""),
          holiday_name_th: String(row.holiday_name_th || row.name_th || row.holiday_name || "-"),
        }))
      );
    } catch (error) {
      console.error("Failed to fetch holidays:", error);
    }
  }, [canManageHoliday]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);


  useEffect(() => {
    if (leaveTypeOptions.length === 0 || leaveForm.leaveTypeId) return;
    setLeaveForm((prev) => ({ ...prev, leaveTypeId: String(leaveTypeOptions[0].id) }));
  }, [leaveForm.leaveTypeId, leaveTypeOptions]);

  const myLeaveHistory = useMemo(
    () => requests.filter((r: any) => {
      if (!ownUserId) return true;
      return Number(r?.user_id || 0) === ownUserId;
    }),
    [ownUserId, requests]
  );

  const teamPendingRequests = useMemo(
    () => requests.filter((r: any) => {
      const isPending = String(r.status || "").toLowerCase() === "pending";
      if (!isPending) return false;
      if (!isManagerView || !ownUserId) return true;
      return Number(r?.user_id || 0) !== ownUserId;
    }),
    [isManagerView, ownUserId, requests]
  );

  const leaveBalanceByType = useMemo(() => {
    const grouped = new Map<string, { leaveTypeCode: string; leaveTypeName: string; quota: number; used: number; pending: number; balance: number }>();
    (balances || []).forEach((row: any) => {
      const leaveTypeCode = inferLeaveTypeCode(row.leave_type_code, row.leave_type_name, row.leave_type_id || row.id);
      const leaveTypeName = getLeaveTypeLabel(leaveTypeCode, row.leave_type_name, row.leave_type_id || row.id);
      const prev = grouped.get(leaveTypeCode) || { leaveTypeCode, leaveTypeName, quota: 0, used: 0, pending: 0, balance: 0 };
      grouped.set(leaveTypeCode, {
        leaveTypeCode,
        leaveTypeName,
        quota: prev.quota + Number(row.quota || 0),
        used: prev.used + Number(row.used || 0),
        pending: prev.pending + Number(row.pending || 0),
        balance: prev.balance + Number(row.balance || 0),
      });
    });
    return Array.from(grouped.values());
  }, [balances, t]);

  const overlapWarningByRequestId = useMemo(() => {
    const overlapMap = new Map<number, { approved: number; pending: number }>();

    const overlaps = (a: any, b: any) => {
      if (!a.start_date || !a.end_date || !b.start_date || !b.end_date) return false;
      const aStart = new Date(a.start_date).getTime();
      const aEnd = new Date(a.end_date).getTime();
      const bStart = new Date(b.start_date).getTime();
      const bEnd = new Date(b.end_date).getTime();
      return aStart <= bEnd && bStart <= aEnd;
    };

    teamPendingRequests.forEach((request: any) => {
      const overlapRows = requests.filter((other: any) => {
        if (other.id === request.id) return false;
        if (!overlaps(request, other)) return false;
        const st = String(other.status || "").toLowerCase();
        return st === "approved" || st === "pending";
      });

      const approved = overlapRows.filter((r: any) => String(r.status || "").toLowerCase() === "approved").length;
      const pending = overlapRows.filter((r: any) => String(r.status || "").toLowerCase() === "pending").length;
      overlapMap.set(request.id, { approved, pending });
    });

    return overlapMap;
  }, [teamPendingRequests, requests]);

  const handleLeaveAttachment = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setLeaveForm((prev) => ({ ...prev, attachmentName: file?.name || "" }));
  };

  const handleCreateLeaveRequest = async () => {
    setRequestError("");
    setRequestSuccess("");

    const totalDaysNumber = Number(leaveForm.totalDays || 0);
    if (!leaveForm.leaveTypeId || !leaveForm.startDate || !leaveForm.endDate || !totalDaysNumber || !leaveForm.reason) {
      setRequestError(t("leaveManagement.messages.fillRequired"));
      return;
    }

    setFormLoading(true);
    try {
      await apiPost("/leaves/request", {
        leave_type_id: Number(leaveForm.leaveTypeId),
        start_date: leaveForm.startDate,
        end_date: leaveForm.endDate,
        total_days: totalDaysNumber,
        reason: leaveForm.reason,
        attachment_name: leaveForm.attachmentName || null,
      });

      setRequestSuccess(t("leaveManagement.messages.requestSubmitted"));
      setLeaveForm({
        leaveTypeId: String(leaveTypeOptions[0]?.id || ""),
        startDate: "",
        endDate: "",
        totalDays: "",
        reason: "",
        attachmentName: "",
      });
      if (isEmployeeOnly) {
        setShowEmployeeRequestForm(false);
        setEmployeeView("history");
      }

      const res = await apiGet<any>("/leaves/requests");
      const rows = Array.isArray(res) ? res : res?.data || [];
      setRequests(rows);
    } catch (error: any) {
      const message = error instanceof Error ? error.message : t("leaveManagement.messages.requestFailed");
      setRequestError(message);
    } finally {
      setFormLoading(false);
    }
  };
  

  const handlePolicyChange = (index: number, field: "service_years" | "vacation_days" | "sick_cert_required_after_days", value: string) => {
    const next = Number(value || 0);
    setPolicyRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: Number.isFinite(next) ? next : 0 } : row)));
  };

  const handleSavePolicies = async () => {
    try {
      setPolicySaving(true);
      await apiPut("/admin/leave-policies", { rows: policyRows });
      window.alert("Saved leave policies");
    } catch (error: any) {
      window.alert(error?.message || "Failed to save leave policies");
    } finally {
      setPolicySaving(false);
    }
  };

  const handleUpdateLeaveStatus = async (request: any, status: "approved" | "rejected") => {
    const id = Number(request?.id);
    if (!id) return;

    if (status === "approved") {
      const warning = overlapWarningByRequestId.get(id);
      const approvedOverlap = Number(warning?.approved || 0);
      if (approvedOverlap > 0) {
        const confirmApprove = window.confirm(
          t("leaveManagement.approval.confirmOverlap").replace("{{count}}", String(approvedOverlap))
        );
        if (!confirmApprove) return;
      }
    }

    try {
      await apiPut(`/leaves/${id}/status`, { status });
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (error) {
      console.error("Failed to update leave status:", error);
    }
  };

  const sortedMyLeaveHistory = useMemo(() => {
    return [...myLeaveHistory].sort((a: any, b: any) => {
      const ad = new Date(a?.created_at || a?.start_date || 0).getTime();
      const bd = new Date(b?.created_at || b?.start_date || 0).getTime();
      return bd - ad;
    });
  }, [myLeaveHistory]);

  const filteredMyLeaveHistory = useMemo(() => {
    if (employeeStatusFilter === "all") return sortedMyLeaveHistory;
    return sortedMyLeaveHistory.filter((r: any) => String(r?.status || "").toLowerCase() === employeeStatusFilter);
  }, [employeeStatusFilter, sortedMyLeaveHistory]);

  const leaveStatusCounts = useMemo(() => {
    const counts = { all: sortedMyLeaveHistory.length, pending: 0, approved: 0, rejected: 0 };
    sortedMyLeaveHistory.forEach((r: any) => {
      const s = String(r?.status || "").toLowerCase();
      if (s === "pending") counts.pending += 1;
      if (s === "approved") counts.approved += 1;
      if (s === "rejected") counts.rejected += 1;
    });
    return counts;
  }, [sortedMyLeaveHistory]);

  const monthEvents = useMemo(() => {
    const leaveEvents = requests
      .filter((r: any) => String(r?.start_date || "").startsWith(calendarMonth) || String(r?.end_date || "").startsWith(calendarMonth))
      .map((r: any) => ({
        id: `leave-${r.id}`,
        date: String(r.start_date || ""),
        title: `${getLeaveTypeLabel(r.leave_type_code, r.leave_type_name, r.leave_type_id || r.id)} - ${r.firstname_th || ""} ${r.lastname_th || ""}`.trim(),
        status: String(r.status || "pending").toLowerCase(),
        kind: "leave" as const,
      }));

    const holidayEvents = holidays
      .filter((h) => String(h.holiday_date || "").startsWith(calendarMonth))
      .map((h) => ({
        id: `holiday-${h.id}`,
        date: String(h.holiday_date || ""),
        title: h.holiday_name_th,
        status: "holiday",
        kind: "holiday" as const,
      }));

    return [...holidayEvents, ...leaveEvents].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [calendarMonth, holidays, requests, t]);

  const handleCreateHoliday = async () => {
    const date = window.prompt(t("leaveManagement.holidays.table.date"));
    if (!date) return;
    const name = window.prompt(t("leaveManagement.holidays.table.name"));
    if (!name) return;

    try {
      await apiPost("/holidays", { date, holiday_name_th: name, is_paid: 1 });
      await fetchHolidays();
    } catch (error: any) {
      window.alert(error?.message || "Failed to create holiday");
    }
  };

  const handleEditHoliday = async (holiday: HolidayRow) => {
    const date = window.prompt(t("leaveManagement.holidays.table.date"), holiday.holiday_date || "");
    if (!date) return;
    const name = window.prompt(t("leaveManagement.holidays.table.name"), holiday.holiday_name_th || "");
    if (!name) return;

    try {
      await apiPut(`/holidays/${holiday.id}`, { date, holiday_name_th: name });
      await fetchHolidays();
    } catch (error: any) {
      window.alert(error?.message || "Failed to update holiday");
    }
  };

  const handleDeleteHoliday = async (holiday: HolidayRow) => {
    const confirmed = window.confirm(`${t("leaveManagement.holidays.edit")}: ${holiday.holiday_name_th}?`);
    if (!confirmed) return;

    try {
      await apiDelete(`/holidays/${holiday.id}`);
      await fetchHolidays();
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete holiday");
    }
  };

  if (isEmployeeOnly) {

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setEmployeeView("request")}
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition-colors ${employeeView === "request" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              {t("leaveManagement.employee.tab")}
            </button>
            <button
              type="button"
              onClick={() => setEmployeeView("history")}
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition-colors ${employeeView === "history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
            >
              {t("leaveManagement.employee.historyTab")}
            </button>
          </div>
          <Button size="sm" onClick={() => { setShowEmployeeRequestForm((v) => !v); setEmployeeView("request"); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t("leaveManagement.employee.requestLeave")}
          </Button>
        </div>

        {(showEmployeeRequestForm || employeeView === "request") && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("leaveManagement.employee.requestTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {requestError ? <p className="text-sm text-destructive">{requestError}</p> : null}
              {requestSuccess ? <p className="text-sm text-success">{requestSuccess}</p> : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("leaveManagement.fields.leaveType")}</p>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={leaveForm.leaveTypeId}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveTypeId: e.target.value }))}
                  >
                    {leaveTypeOptions.map((item) => (
                        <option key={item.id} value={item.id}>{getLeaveTypeLabel(item.leaveTypeCode, item.name, item.id)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("leaveManagement.fields.totalDaysHours")}</p>
                  <Input
                    type="number"
                    step="0.5"
                    value={leaveForm.totalDays}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, totalDays: e.target.value }))}
                    placeholder={t("leaveManagement.fields.totalDaysPlaceholder")}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("leaveManagement.fields.startDate")}</p>
                  <Input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("leaveManagement.fields.endDate")}</p>
                  <Input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("leaveManagement.fields.reason")}</p>
                <Textarea
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder={t("leaveManagement.fields.reasonPlaceholder")}
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateLeaveRequest} disabled={formLoading}>
                  {formLoading ? t("leaveManagement.actions.submitting") : t("leaveManagement.actions.confirmSubmit")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowEmployeeRequestForm(false)}>
                  {t("leaveManagement.actions.cancel")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{t("leaveManagement.employee.leaveHistory")}</CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-xs text-muted-foreground">
                  {t("leaveManagement.history.summary")} {leaveStatusCounts.all} | {t("leaveManagement.status.pending")} {leaveStatusCounts.pending} | {t("leaveManagement.status.approved")} {leaveStatusCounts.approved} | {t("leaveManagement.status.rejected")} {leaveStatusCounts.rejected}
                </span>
                <span className="text-muted-foreground">{t("leaveManagement.fields.status")}:</span>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={employeeStatusFilter}
                  onChange={(e) => setEmployeeStatusFilter(e.target.value as "all" | "pending" | "approved" | "rejected")}
                >
                  <option value="all">{t("leaveManagement.status.all")}</option>
                  <option value="pending">{t("leaveManagement.status.pending")}</option>
                  <option value="approved">{t("leaveManagement.status.approved")}</option>
                  <option value="rejected">{t("leaveManagement.status.rejected")}</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.table.type")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.table.date")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.table.total")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {loadingRequests ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">{t("leaveManagement.loading")}</td>
                  </tr>
                ) : filteredMyLeaveHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">{t("leaveManagement.noHistory")}</td>
                  </tr>
                ) : (
                  filteredMyLeaveHistory.slice(0, 10).map((r: any) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{getLeaveTypeLabel(r.leave_type_code, r.leave_type_name, r.leave_type_id || r.id)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.start_date} - {r.end_date}</td>
                      <td className="px-4 py-3">{r.total_days || 0} {t("leaveManagement.common.day")}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={getStatusClass(r.status)}>{getStatusLabel(r.status)}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
  <div className="space-y-10 animate-fade-in pb-10">
    {/* ---------------- SECTION 1: MY LEAVE ---------------- */}
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {t("leaveManagement.tabs.myLeave")}
        </h2>
      </div>

      <div className="space-y-6">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("leaveManagement.myLeave.balanceTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {leaveBalanceByType.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <p className="text-sm">{t("leaveManagement.myLeave.emptyBalance")}</p>
              </div>
            ) : (
              <div className="grid grid-rows-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {leaveBalanceByType.map((row) => {
                  const percent = row.quota
                    ? Math.min((row.used / row.quota) * 100, 100)
                    : 0;

                  return (
                    <div
                      key={row.leaveTypeCode}
                      className="group rounded-xl border border-border/60 p-5 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200"
                    >
                      {/* Title & Quota */}
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {row.leaveTypeName}
                        </p>
                        <Badge variant="secondary" className="font-mono">
                          {row.quota} {t("leaveManagement.common.day")}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-5">
                        <div
                          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 divide-x divide-border">
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-2xl font-bold text-blue-500">{row.used}</p>
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                            {t("leaveManagement.myLeave.table.used")}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-2xl font-bold text-amber-500">{row.pending}</p>
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                            {t("leaveManagement.myLeave.table.pending")}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <p className="text-2xl font-bold text-emerald-500">{row.balance}</p>
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                            {t("leaveManagement.myLeave.table.balance")}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leave History */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("leaveManagement.myLeave.historyTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingRequests ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-sm text-muted-foreground animate-pulse">{t("leaveManagement.loading")}</p>
              </div>
            ) : myLeaveHistory.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <p className="text-sm">{t("leaveManagement.noHistory")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myLeaveHistory.slice(0, 8).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border/60 p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {getLeaveTypeLabel(r.leave_type_code, r.leave_type_name, r.leave_type_id || r.id)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {r.start_date} <span className="text-muted-foreground/50">to</span> {r.end_date} 
                        <span className="font-medium px-1 bg-muted rounded">
                          {r.total_days} {t("leaveManagement.common.day")}
                        </span>
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`capitalize ${
                        r.status === "approved" ? "border-emerald-500 text-emerald-600 bg-emerald-50" :
                        r.status === "rejected" ? "border-red-500 text-red-600 bg-red-50" :
                        "border-amber-500 text-amber-600 bg-amber-50"
                      }`}
                    >
                      {r.status || "-"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

    {/* ---------------- SECTION 2: REQUEST LEAVE ---------------- */}
    {canRequestLeave && (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mt-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("leaveManagement.tabs.requestLeave")}
          </h2>
        </div>
        
        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("leaveManagement.request.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {requestError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md">
                {requestError}
              </div>
            )}
            {requestSuccess && (
              <div className="bg-success/10 border border-success/20 text-success text-sm p-3 rounded-md">
                {requestSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("leaveManagement.fields.leaveType")}
                </label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  value={leaveForm.leaveTypeId}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveTypeId: e.target.value }))}
                >
                  {leaveTypeOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {getLeaveTypeLabel(item.leaveTypeCode, item.name, item.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("leaveManagement.fields.totalDaysHours")}
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={leaveForm.totalDays}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, totalDays: e.target.value }))}
                  placeholder={t("leaveManagement.fields.totalDaysPlaceholder")}
                  className="focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("leaveManagement.fields.startDate")}
                </label>
                <Input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("leaveManagement.fields.endDate")}
                </label>
                <Input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("leaveManagement.fields.reason")}
              </label>
              <Textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder={t("leaveManagement.fields.reasonPlaceholder")}
                className="min-h-[100px] resize-y focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2 p-4 border border-dashed rounded-lg bg-muted/10">
              <label className="text-sm font-medium text-foreground flex flex-col gap-1 cursor-pointer">
                <span>{t("leaveManagement.request.attachment")}</span>
                <span className="text-xs text-muted-foreground font-normal">Upload supporting documents if required (e.g., Medical Certificate)</span>
              </label>
              <Input type="file" onChange={handleLeaveAttachment} className="mt-2" />
              {leaveForm.attachmentName && (
                <p className="text-sm text-primary font-medium mt-2 flex items-center gap-1">
                  📎 {t("leaveManagement.request.selectedFile")}: {leaveForm.attachmentName}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8" 
                onClick={handleCreateLeaveRequest} 
                disabled={formLoading}
              >
                {formLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-b-transparent animate-spin" />
                    {t("leaveManagement.actions.submitting")}
                  </span>
                ) : (
                  t("leaveManagement.request.create")
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

    {/* ---------------- SECTION 3: TEAM REQUESTS ---------------- */}
    {canManageLeave && (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mt-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("leaveManagement.tabs.teamRequests")}
          </h2>
        </div>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("leaveManagement.approval.title")}
            </CardTitle>
            {isSuperAdmin && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                Super Admin can monitor requests for support, but direct approve/reject is disabled.
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loadingRequests ? (
              <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
                {t("leaveManagement.approval.loading")}
              </div>
            ) : teamPendingRequests.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t("leaveManagement.approval.empty")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.approval.table.employee")}</th>
                      <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.approval.table.leaveType")}</th>
                      <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.approval.table.dateRange")}</th>
                      <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.approval.table.overlapWarning")}</th>
                      <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap text-right">{t("leaveManagement.approval.table.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teamPendingRequests.map((r: any) => {
                      const overlap = overlapWarningByRequestId.get(r.id) || { approved: 0, pending: 0 };
                      const overlapCount = Number(overlap.approved || 0) + Number(overlap.pending || 0);
                      return (
                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4 font-medium whitespace-nowrap">
                            {r.firstname_th || ""} {r.lastname_th || ""}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <Badge variant="outline" className="font-normal bg-background">
                              {getLeaveTypeLabel(r.leave_type_code, r.leave_type_name, r.leave_type_id || r.id)}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                            {r.start_date} <span className="mx-1">→</span> {r.end_date} 
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-xs font-medium text-foreground">
                              {r.total_days} {t("leaveManagement.common.day")}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {overlapCount > 0 ? (
                              <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                ⚠️ {t("leaveManagement.approval.overlapWarning")
                                  .replace("{{count}}", String(overlapCount))
                                  .replace("{{approved}}", String(overlap.approved || 0))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground px-2">
                                {t("leaveManagement.approval.noOverlap")}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            {canApproveLeaveTransactions ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors" onClick={() => handleUpdateLeaveStatus(r, "rejected")}>
                                  {t("leaveManagement.actions.reject")}
                                </Button>
                                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm" onClick={() => handleUpdateLeaveStatus(r, "approved")}>
                                  {t("leaveManagement.actions.approve")}
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-muted-foreground font-normal">Read only</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )}

    {/* ---------------- SECTION 4: BALANCE ADJUSTMENT ---------------- */}
    {canManageLeavePolicy && (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mt-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("leaveManagement.tabs.balanceAdjustment")}
          </h2>
        </div>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-base font-semibold">
              {t("leaveManagement.balanceAdjust.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {balances.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {t("leaveManagement.balanceAdjust.empty")}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {balances.slice(0, 12).map((b: any) => (
                  <div key={b.id} className="rounded-lg border border-border/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card hover:shadow-sm transition-all">
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">
                        {b.firstname_th || ""} {b.lastname_th || ""} 
                        <span className="text-muted-foreground font-normal ml-2 text-xs border-l pl-2">
                          {getLeaveTypeLabel(b.leave_type_code, b.leave_type_name, b.leave_type_id || b.id)}
                        </span>
                      </p>
                      <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-muted/30 text-muted-foreground">
                        {t("leaveManagement.balanceAdjust.summary")
                          .replace("{{quota}}", String(b.quota || 0))
                          .replace("{{used}}", String(b.used || 0))
                          .replace("{{balance}}", String(b.balance || 0))}
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" className="sm:shrink-0 w-full sm:w-auto">
                      {t("leaveManagement.balanceAdjust.adjust")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )}

    {/* ---------------- SECTION 5: LEAVE POLICY ---------------- */}
    {canManageLeavePolicy && (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mt-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("leaveManagement.tabs.leavePolicy")}
          </h2>
        </div>

        <Card className="shadow-sm border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/20 border-b pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" /> 
              {t("leaveManagement.policy.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.policy.table.company")}</th>
                    <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.policy.table.serviceYears")}</th>
                    <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.policy.table.vacationDays")}</th>
                    <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.policy.table.sickCert")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {policyRows.map((row, index) => (
                    <tr key={row.company_id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">
                        {row.company_name || row.company_code}
                      </td>
                      <td className="px-5 py-3 min-w-[120px]">
                        <Input 
                          value={row.service_years} 
                          onChange={(e) => handlePolicyChange(index, "service_years", e.target.value)} 
                          className="h-9 focus-visible:ring-primary"
                        />
                      </td>
                      <td className="px-5 py-3 min-w-[120px]">
                        <Input 
                          value={row.vacation_days} 
                          onChange={(e) => handlePolicyChange(index, "vacation_days", e.target.value)} 
                          className="h-9 focus-visible:ring-primary"
                        />
                      </td>
                      <td className="px-5 py-3 min-w-[180px]">
                        <Input
                          value={row.sick_cert_required_after_days}
                          onChange={(e) => handlePolicyChange(index, "sick_cert_required_after_days", e.target.value)}
                          className="h-9 focus-visible:ring-primary"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 border-t bg-muted/10 flex justify-end">
              <Button size="default" className="px-6" onClick={handleSavePolicies} disabled={policySaving}>
                {policySaving ? "Saving..." : t("leaveManagement.policy.save")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

    {/* ---------------- SECTION 6: LEAVE CALENDAR ---------------- */}
    {canManageLeave && (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mt-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("leaveManagement.tabs.leaveCalendar")}
          </h2>
        </div>

        <Card className="shadow-sm border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/20 border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold">
              {t("leaveManagement.tabs.leaveCalendar")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input 
                type="month" 
                value={calendarMonth} 
                onChange={(e) => setCalendarMonth(e.target.value)} 
                className="w-full sm:w-[180px] h-9 focus-visible:ring-primary" 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {monthEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-muted/5">
                <Calendar className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">{t("leaveManagement.calendar.placeholder")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.table.date")}</th>
                      <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.table.type")}</th>
                      <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.table.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-5 py-4 font-mono text-sm text-muted-foreground whitespace-nowrap">
                          {event.date}
                        </td>
                        <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">
                          {event.title}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {event.kind === "holiday" ? (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                              Holiday
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={getStatusClass(event.status)}>
                              {getStatusLabel(event.status)}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )}

    {/* ---------------- SECTION 7: HOLIDAY MANAGEMENT ---------------- */}
    {canManageHoliday && (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mt-8">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {t("leaveManagement.tabs.holidayManagement")}
          </h2>
        </div>

        <Card className="shadow-sm border-border/50 overflow-hidden">
          <CardHeader className="bg-muted/20 border-b pb-4 flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold">
              {t("leaveManagement.holidays.title")}
            </CardTitle>
            <Button size="sm" className="gap-2 shadow-sm shrink-0" onClick={handleCreateHoliday}>
              <Plus className="h-4 w-4" /> {t("leaveManagement.holidays.add")}
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.holidays.table.date")}</th>
                    <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("leaveManagement.holidays.table.name")}</th>
                    <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap text-right">{t("leaveManagement.holidays.table.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4 font-mono text-sm text-muted-foreground whitespace-nowrap">
                        {h.holiday_date}
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">
                        {h.holiday_name_th}
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-8 hover:bg-muted" onClick={() => handleEditHoliday(h)}>
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            {t("leaveManagement.holidays.edit")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteHoliday(h)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            {t("leaveManagement.actions.reject")} {/* Note: ใช้ translation ของ Reject ตามต้นฉบับ */}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
  </div>
);
};

export default LeaveManagement;
