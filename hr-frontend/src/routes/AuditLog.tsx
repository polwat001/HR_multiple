import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

const actionColor: Record<string, string> = {
  LOGIN: "default",
  CREATE_USER: "secondary",
  UPDATE_ROLE: "secondary",
  DELETE_DATA: "destructive",
};

const AuditLog = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        ...(userFilter ? { user: userFilter } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(ipFilter ? { ip: ipFilter } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
        limit: "500",
      }).toString();

      const res = await apiGet<any>(`/admin/audit-logs${query ? `?${query}` : ""}`);
      setLogs(Array.isArray(res) ? res : res?.data || []);
    } catch (e: any) {
      console.error("Failed to fetch audit logs:", e);
      setError(e instanceof Error ? e.message : t("auditLog.fallbackError"));
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const actionOptions = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l: any) => s.add(String(l.action || "")));
    return Array.from(s).filter(Boolean);
  }, [logs]);

  const handleExportCsv = () => {
    const header = ["id", "created_at", "username", "user_id", "action", "target", "ip_address"];
    const csv = [
      header.join(","),
      ...logs.map((r: any) =>
        header
          .map((key) => {
            const value = String(r?.[key] ?? "").replaceAll('"', '""');
            return `"${value}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">{t("auditLog.filtersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <Input placeholder={t("auditLog.filter.user")} value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">{t("auditLog.filter.allActions")}</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <Input placeholder={t("auditLog.filter.ipAddress")} value={ipFilter} onChange={(e) => setIpFilter(e.target.value)} />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Button variant="outline" onClick={fetchLogs}>{t("auditLog.filter.apply")}</Button>
        </CardContent>
      </Card>

      <Card className="shadow-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("auditLog.tableTitle")}</CardTitle>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>{t("auditLog.exportCsv")}</Button>
        </CardHeader>
        <CardContent className="p-0">
          {error ? <p className="px-4 py-3 text-sm text-destructive">{error}</p> : null}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("auditLog.headers.time")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("auditLog.headers.user")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("auditLog.headers.action")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("auditLog.headers.target")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("auditLog.headers.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("auditLog.loading")}</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("auditLog.empty")}</td>
                </tr>
              ) : logs.map((l) => (
                <tr key={l.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{l.created_at || l.time}</td>
                  <td className="px-4 py-3">{l.username || l.user || `user#${l.user_id || "-"}`}</td>
                  <td className="px-4 py-3">
                    <Badge variant={actionColor[l.action] as "default" | "secondary" | "destructive"}>{l.action}</Badge>
                  </td>
                  <td className="px-4 py-3">{l.target || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{l.ip_address || l.ip || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
