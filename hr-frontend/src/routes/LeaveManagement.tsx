import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Plus, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { resolveRoleViewKey } from "@/lib/accessMatrix";
import { useLanguage } from "@/contexts/LanguageContext";

const leaveTypeOptions = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
];

const initialPolicyRows = [
  { company: "ABC", serviceYears: "1", vacationDays: "6", sickCertRequiredAfterDays: "2" },
  { company: "XYZ", serviceYears: "1", vacationDays: "10", sickCertRequiredAfterDays: "2" },
  { company: "DEF", serviceYears: "1", vacationDays: "8", sickCertRequiredAfterDays: "3" },
];

const holidays = [
  { date: "2026-01-01", nameKey: "newYear" },
  { date: "2026-02-26", nameKey: "makhaBucha" },
  { date: "2026-04-06", nameKey: "chakri" },
  { date: "2026-04-13", nameKey: "songkran" },
  { date: "2026-04-14", nameKey: "songkran" },
  { date: "2026-04-15", nameKey: "songkran" },
  { date: "2026-05-01", nameKey: "labour" },
  { date: "2026-05-04", nameKey: "coronation" },
  { date: "2026-06-03", nameKey: "queenSuthidaBirthday" },
  { date: "2026-07-28", nameKey: "kingBirthdaySubstitute" },
  { date: "2026-08-12", nameKey: "mothersDay" },
  { date: "2026-10-23", nameKey: "chulalongkorn" },
  { date: "2026-12-05", nameKey: "fathersDay" },
  { date: "2026-12-10", nameKey: "constitution" },
  { date: "2026-12-31", nameKey: "yearEnd" },
];

const LeaveManagement = () => {
  const { t } = useLanguage();
  const { hasPermission, hasRole, user } = useAuth();
  const roleViewKey = resolveRoleViewKey(user as any);
  const isManagerView = roleViewKey === "manager";
  const ownUserId = Number((user as any)?.user_id || 0);
  const canRequestLeave = hasPermission(Permission.REQUEST_LEAVE);
  const canManageLeave = hasPermission(Permission.APPROVE_DEPARTMENT_LEAVE) || hasPermission(Permission.MANAGE_COMPANY_LEAVE) || hasPermission(Permission.MANAGE_ALL_LEAVE);
  const canManageLeavePolicy = hasPermission(Permission.MANAGE_COMPANY_LEAVE) || hasPermission(Permission.MANAGE_ALL_LEAVE);
  const canManageHoliday = hasPermission(Permission.MANAGE_COMPANY_HOLIDAYS) || hasPermission(Permission.MANAGE_ALL_HOLIDAYS);
  const isEmployeeOnly = canRequestLeave && !canManageLeave;
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [policyRows, setPolicyRows] = useState(initialPolicyRows);
  const [leaveForm, setLeaveForm] = useState({
    leaveTypeId: "1",
    startDate: "",
    endDate: "",
    totalDays: "",
    reason: "",
    attachmentName: "",
  });
  const [showEmployeeRequestForm, setShowEmployeeRequestForm] = useState(false);
  const [employeeView, setEmployeeView] = useState<"history" | "request">("history");
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const getStatusLabel = (status?: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") return t("leaveManagement.status.approved");
    if (s === "pending") return t("leaveManagement.status.pending");
    if (s === "rejected") return t("leaveManagement.status.rejected");
    return status || t("leaveManagement.common.na");
  };

  const getStatusClass = (status?: string) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved") return "bg-success/10 text-success border-success/30";
    if (s === "pending") return "bg-warning/10 text-warning border-warning/30";
    if (s === "rejected") return "bg-destructive/10 text-destructive border-destructive/30";
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
    const grouped = new Map<string, { quota: number; used: number; pending: number; balance: number }>();
    (balances || []).forEach((row: any) => {
      const name = row.leave_type_name || t("leaveManagement.common.unknown");
      const prev = grouped.get(name) || { quota: 0, used: 0, pending: 0, balance: 0 };
      grouped.set(name, {
        quota: prev.quota + Number(row.quota || 0),
        used: prev.used + Number(row.used || 0),
        pending: prev.pending + Number(row.pending || 0),
        balance: prev.balance + Number(row.balance || 0),
      });
    });
    return Array.from(grouped.entries()).map(([leaveTypeName, summary]) => ({ leaveTypeName, ...summary }));
  }, [balances]);

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
        leaveTypeId: "1",
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

  const handlePolicyChange = (index: number, field: "serviceYears" | "vacationDays" | "sickCertRequiredAfterDays", value: string) => {
    setPolicyRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
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
                      <option key={item.id} value={item.id}>{t(`leaveManagement.leaveTypes.${item.id}`)}</option>
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
                      <td className="px-4 py-3">{r.leave_type_name || "-"}</td>
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
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="my-leave">
        <TabsList>
          <TabsTrigger value="my-leave">{t("leaveManagement.tabs.myLeave")}</TabsTrigger>
          {canRequestLeave && <TabsTrigger value="request">{t("leaveManagement.tabs.requestLeave")}</TabsTrigger>}
          {canManageLeave && <TabsTrigger value="approval">{t("leaveManagement.tabs.teamRequests")}</TabsTrigger>}
          {canManageLeavePolicy && <TabsTrigger value="balance-adjust">{t("leaveManagement.tabs.balanceAdjustment")}</TabsTrigger>}
          {canManageLeavePolicy && <TabsTrigger value="policy">{t("leaveManagement.tabs.leavePolicy")}</TabsTrigger>}
          <TabsTrigger value="calendar">{t("leaveManagement.tabs.leaveCalendar")}</TabsTrigger>
          {canManageHoliday && <TabsTrigger value="holidays">{t("leaveManagement.tabs.holidayManagement")}</TabsTrigger>}
        </TabsList>

      <TabsContent value="my-leave" className="mt-4">
        <div className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
                <CardTitle className="text-base">{t("leaveManagement.myLeave.balanceTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.myLeave.table.leaveType")}</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.myLeave.table.quota")}</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.myLeave.table.used")}</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.myLeave.table.pending")}</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.myLeave.table.balance")}</th>
                </tr></thead>
                <tbody>
                  {leaveBalanceByType.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">{t("leaveManagement.myLeave.emptyBalance")}</td>
                    </tr>
                  ) : (
                    leaveBalanceByType.map((row) => (
                      <tr key={row.leaveTypeName} className="border-b last:border-b-0">
                        <td className="px-4 py-3 font-medium">{row.leaveTypeName}</td>
                        <td className="px-4 py-3 text-center">{row.quota}</td>
                        <td className="px-4 py-3 text-center">{row.used}</td>
                        <td className="px-4 py-3 text-center">{row.pending}</td>
                        <td className="px-4 py-3 text-center font-semibold">{row.balance}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("leaveManagement.myLeave.historyTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <p className="text-sm text-muted-foreground">{t("leaveManagement.loading")}</p>
              ) : myLeaveHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("leaveManagement.noHistory")}</p>
              ) : (
                <div className="space-y-3">
                  {myLeaveHistory.slice(0, 8).map((r: any) => (
                    <div key={r.id} className="rounded-md border border-border p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.leave_type_name || t("leaveManagement.labels.leave")}</p>
                        <p className="text-xs text-muted-foreground">{r.start_date} - {r.end_date} ({r.total_days} {t("leaveManagement.common.day")})</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{r.status || "-"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {canRequestLeave && (
      <TabsContent value="request" className="mt-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">{t("leaveManagement.request.title")}</CardTitle>
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
                    <option key={item.id} value={item.id}>{t(`leaveManagement.leaveTypes.${item.id}`)}</option>
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

            <div>
              <p className="text-sm text-muted-foreground mb-1">{t("leaveManagement.request.attachment")}</p>
              <Input type="file" onChange={handleLeaveAttachment} />
              {leaveForm.attachmentName ? (
                <p className="text-xs text-muted-foreground mt-1">{t("leaveManagement.request.selectedFile")}: {leaveForm.attachmentName}</p>
              ) : null}
            </div>

            <Button size="sm" onClick={handleCreateLeaveRequest} disabled={formLoading}>
              {formLoading ? t("leaveManagement.actions.submitting") : t("leaveManagement.request.create")}
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canManageLeave && (
      <TabsContent value="approval" className="mt-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">{t("leaveManagement.approval.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <p className="text-sm text-muted-foreground">{t("leaveManagement.approval.loading")}</p>
            ) : teamPendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("leaveManagement.approval.empty")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.approval.table.employee")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.approval.table.leaveType")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.approval.table.dateRange")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.approval.table.overlapWarning")}</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.approval.table.action")}</th>
                </tr></thead>
                <tbody>
                  {teamPendingRequests.map((r: any) => {
                    const overlap = overlapWarningByRequestId.get(r.id) || { approved: 0, pending: 0 };
                    const overlapCount = Number(overlap.approved || 0) + Number(overlap.pending || 0);
                    return (
                      <tr key={r.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">{r.firstname_th || ""} {r.lastname_th || ""}</td>
                        <td className="px-4 py-3">{r.leave_type_name || t("leaveManagement.labels.leave")}</td>
                        <td className="px-4 py-3 text-xs">{r.start_date} - {r.end_date} ({r.total_days} {t("leaveManagement.common.day")})</td>
                        <td className="px-4 py-3">
                          {overlapCount > 0 ? (
                            <div className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs text-warning">
                              {t("leaveManagement.approval.overlapWarning")
                                .replace("{{count}}", String(overlapCount))
                                .replace("{{approved}}", String(overlap.approved || 0))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{t("leaveManagement.approval.noOverlap")}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => handleUpdateLeaveStatus(r, "rejected")}>{t("leaveManagement.actions.reject")}</Button>
                            <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => handleUpdateLeaveStatus(r, "approved")}>{t("leaveManagement.actions.approve")}</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canManageLeavePolicy && (
      <TabsContent value="balance-adjust" className="mt-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">{t("leaveManagement.balanceAdjust.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("leaveManagement.balanceAdjust.empty")}</p>
            ) : (
              <div className="space-y-3">
                {balances.slice(0, 12).map((b: any) => (
                  <div key={b.id} className="rounded-md border border-border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{b.firstname_th || ""} {b.lastname_th || ""} - {b.leave_type_name || t("leaveManagement.labels.leave")}</p>
                      <p className="text-xs text-muted-foreground">{t("leaveManagement.balanceAdjust.summary").replace("{{quota}}", String(b.quota || 0)).replace("{{used}}", String(b.used || 0)).replace("{{balance}}", String(b.balance || 0))}</p>
                    </div>
                    <Button size="sm" variant="outline">{t("leaveManagement.balanceAdjust.adjust")}</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canManageLeavePolicy && (
      <TabsContent value="policy" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> {t("leaveManagement.policy.title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.policy.table.company")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.policy.table.serviceYears")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.policy.table.vacationDays")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.policy.table.sickCert")}</th>
              </tr></thead>
              <tbody>
                {policyRows.map((row, index) => (
                  <tr key={row.company} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">{row.company}</td>
                    <td className="px-4 py-3">
                      <Input value={row.serviceYears} onChange={(e) => handlePolicyChange(index, "serviceYears", e.target.value)} />
                    </td>
                    <td className="px-4 py-3">
                      <Input value={row.vacationDays} onChange={(e) => handlePolicyChange(index, "vacationDays", e.target.value)} />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={row.sickCertRequiredAfterDays}
                        onChange={(e) => handlePolicyChange(index, "sickCertRequiredAfterDays", e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t">
              <Button size="sm">{t("leaveManagement.policy.save")}</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canManageLeave && (
      <TabsContent value="calendar" className="mt-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Calendar className="h-10 w-10 mr-3 opacity-40" />
              <p className="text-sm">{t("leaveManagement.calendar.placeholder")}</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      )}

      {canManageHoliday && (
      <TabsContent value="holidays" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("leaveManagement.holidays.title")}</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> {t("leaveManagement.holidays.add")}</Button>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.holidays.table.date")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.holidays.table.name")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("leaveManagement.holidays.table.action")}</th>
              </tr></thead>
              <tbody>
                {holidays.map((h, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{h.date}</td>
                    <td className="px-4 py-3">{t(`leaveManagement.holidays.names.${h.nameKey}`)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline">{t("leaveManagement.holidays.edit")}</Button>
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

export default LeaveManagement;
