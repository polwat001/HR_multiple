import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPut } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { resolveRoleViewKey } from "@/lib/accessMatrix";

type InboxRow = {
  id: number;
  module: "leave" | "ot";
  employeeName: string;
  employeeCode: string;
  reason: string;
  dateLabel: string;
  createdAt: string;
  pendingDays: number;
  status: string;
};

function asArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  return [];
}

function getPendingDays(createdAt?: string) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const diff = Date.now() - created.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function fmtDate(isoLike?: string) {
  if (!isoLike) return "-";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return String(isoLike);
  return d.toLocaleDateString("th-TH");
}

// Centralized styling constants (refined theme)
const cardClass: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-500/5",
  slaRisk: "border-red-400/30 bg-red-500/5",
  actionMode: "border-green-400/30 bg-green-500/5",
};

const statusBadge: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-green-500/10 text-green-600 border-green-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
};

const moduleBadge: Record<string, string> = {
  leave: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ot: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};


function getCardClass(cardType: "pending" | "slaRisk" | "actionMode"): string {
  return cardClass[cardType] || cardClass.pending;
}

function getStatusBadgeClass(status?: string): string {
  const key = String(status || "").toLowerCase();
  return statusBadge[key] || statusBadge.pending;
}

function getModuleBadgeClass(module?: string): string {
  const key = String(module || "").toLowerCase();
  return moduleBadge[key] || moduleBadge.leave;
}

export default function ApprovalInbox() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const roleViewKey = resolveRoleViewKey(user as any);
  const roleLevel = Number((user as any)?.role_level || 0);
  const canAction = roleLevel >= 20 && roleLevel < 99;

  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string>("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<"all" | "leave" | "ot">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<InboxRow[]>([]);


  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [leaveRes, otRes] = await Promise.all([
        apiGet<any>("/leaves/requests"),
        apiGet<any>("/ot/requests"),
      ]);

      const leaveRows = asArray<any>(leaveRes).map((row) => ({
        id: Number(row.id),
        module: "leave" as const,
        employeeName: `${row.firstname_th || ""} ${row.lastname_th || ""}`.trim() || "-",
        employeeCode: String(row.employee_code || "-"),
        reason: String(row.reason || "-"),
        dateLabel: `${fmtDate(row.start_date)} - ${fmtDate(row.end_date)}`,
        createdAt: String(row.created_at || ""),
        pendingDays: getPendingDays(row.created_at),
        status: String(row.status || "pending").toLowerCase(),
      }));

      const otRows = asArray<any>(otRes).map((row) => ({
        id: Number(row.id),
        module: "ot" as const,
        employeeName: `${row.firstname_th || ""} ${row.lastname_th || ""}`.trim() || "-",
        employeeCode: String(row.employee_code || "-"),
        reason: String(row.reason || "-"),
        dateLabel: fmtDate(row.request_date),
        createdAt: String(row.created_at || ""),
        pendingDays: getPendingDays(row.created_at),
        status: String(row.status || "pending").toLowerCase(),
      }));

      setRows([...leaveRows, ...otRows].sort((a, b) => b.pendingDays - a.pendingDays || b.id - a.id));
    } catch (e: any) {
      console.error("Failed to fetch approval inbox:", e);
      setError(e?.message || "โหลด Approval Inbox ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (moduleFilter !== "all" && row.module !== moduleFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.employeeName.toLowerCase().includes(q) ||
        row.employeeCode.toLowerCase().includes(q) ||
        row.reason.toLowerCase().includes(q)
      );
    });
  }, [rows, moduleFilter, search, statusFilter]);

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const slaRiskCount = rows.filter((r) => r.status === "pending" && r.pendingDays >= 2).length;

  const updateStatus = async (row: InboxRow, status: "approved" | "rejected") => {
    const key = `${row.module}-${row.id}`;
    try {
      setSubmittingId(key);
      const endpoint = row.module === "leave" ? `/leaves/${row.id}/status` : `/ot/${row.id}/status`;
      await apiPut<any>(endpoint, { status });
      setRows((prev) => prev.map((r) => (r.module === row.module && r.id === row.id ? { ...r, status } : r)));
    } catch (e: any) {
      alert(e?.message || "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setSubmittingId("");
    }
  };

  const roleHint =
    roleViewKey === "super_admin"
      ? "Super Admin โหมดนี้เป็น read-only support"
      : roleViewKey === "manager"
        ? "เห็นเฉพาะคำขอทีมของคุณตาม policy"
        : "เห็นคำขอตาม scope ของบทบาทคุณ";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t("approvalInbox.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("approvalInbox.subtitle")}</p>
          <p className="text-xs text-muted-foreground mt-1">{roleHint}</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          {t("approvalInbox.action.refresh")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={`border ${getCardClass("pending")}`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("approvalInbox.status.pending")}   </CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-primary">{pendingCount}</div></CardContent>
        </Card>
        <Card className={`border ${getCardClass("slaRisk")}`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("approvalInbox.card.slaRisk")}</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold text-destructive">{slaRiskCount}</div></CardContent>
        </Card>
        <Card className={`border ${getCardClass("actionMode")}`}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("approvalInbox.card.actionMode")}   </CardTitle></CardHeader>
          <CardContent>
            <Badge className={canAction ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
              {canAction ? t("approvalInbox.card.actionEnabled") : t("approvalInbox.card.readOnly")}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("approvalInbox.section.filters")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input placeholder={t("approvalInbox.filter.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value as any)}>
            <option value="all">{t("approvalInbox.filter.allModules")}</option>
            <option value="leave">{t("approvalInbox.module.leave")}</option>
            <option value="ot">{t("approvalInbox.module.ot")}</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">{t("approvalInbox.filter.allStatus")}</option>
            <option value="pending">{t("approvalInbox.status.pending")}</option>
            <option value="approved">{t("approvalInbox.status.approved")}</option>
            <option value="rejected">{t("approvalInbox.status.rejected")}</option>
          </select>
          <div className="rounded-md border border-input text-sm text-muted-foreground flex items-center justify-center text-center px-3 py-2">รายการที่แสดง: {filteredRows.length}</div>        
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("approvalInbox.section.queue")}  </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <div className="text-sm text-destructive mb-3">{error}</div> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3">{t("approvalInbox.table.module")}</th>
                  <th className="py-2 pr-3">{t("approvalInbox.table.employee")}</th>
                  <th className="py-2 pr-3">{t("approvalInbox.table.period")}</th>
                  <th className="py-2 pr-3">{t("approvalInbox.table.reason")}</th>
                  <th className="py-2 pr-3">{t("approvalInbox.table.status")}</th>
                  <th className="py-2 pr-3">{t("approvalInbox.table.pendingDays")}</th>
                  <th className="py-2 pr-0 text-right">{t("approvalInbox.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="py-4 text-muted-foreground" colSpan={7}>{t("approvalInbox.state.loading")}</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td className="py-4 text-muted-foreground" colSpan={7}>{t("approvalInbox.state.noData")}</td></tr>
                ) : (
                  filteredRows.map((row) => {
                    const key = `${row.module}-${row.id}`;
                    const busy = submittingId === key;
                    const isPending = row.status === "pending";
                    return (
                      <tr key={key} className="border-b border-border/60 align-top">
                        <td className="py-3 pr-3">
                          <Badge variant="outline">{row.module.toUpperCase()}</Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="font-medium">{row.employeeName}</div>
                          <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
                        </td>
                        <td className="py-3 pr-3">{row.dateLabel}</td>
                        <td className="py-3 pr-3 max-w-[320px] truncate" title={row.reason}>{row.reason}</td>
                        <td className="py-3 pr-3">
                          <Badge className={getStatusBadgeClass(row.status)}>
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={row.pendingDays >= 2 && row.status === "pending" ? "text-destructive font-medium" : "text-muted-foreground"}>
                            {row.pendingDays}
                          </span>
                        </td>
                        <td className="py-3 pr-0">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canAction || !isPending || busy}
                              onClick={() => updateStatus(row, "rejected")}
                            >
                              {t("approvalInbox.action.reject")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!canAction || !isPending || busy}
                              onClick={() => updateStatus(row, "approved")}
                            >
                              {t("approvalInbox.action.approve")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
