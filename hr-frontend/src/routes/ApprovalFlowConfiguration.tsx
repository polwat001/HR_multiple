import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/roles";
import { apiGet, apiPut } from "@/lib/api";

const emptyFlowRows = [
  { module: "Leave", level1: "", level2: "", level3: "", escalation_days: 0, delegate_role: "" },
  { module: "OT", level1: "", level2: "", level3: "", escalation_days: 0, delegate_role: "" },
  { module: "Payroll", level1: "", level2: "", level3: "", escalation_days: 0, delegate_role: "" },
];

export default function ApprovalFlowConfiguration() {
  const { hasRole } = useAuth();
  const { t } = useLanguage();
  const isSystemAdmin = hasRole(UserRole.SUPER_ADMIN);
  const [rows, setRows] = useState(emptyFlowRows);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const res = await apiGet<any>("/admin/approval-flows");
        const data = res?.data || {};
        setRows([
          {
            module: "Leave",
            level1: data?.leave?.level1 || "",
            level2: data?.leave?.level2 || "",
            level3: data?.leave?.level3 || "",
            escalation_days: Number(data?.leave?.escalation_days || 0),
            delegate_role: String(data?.leave?.delegate_role || ""),
          },
          {
            module: "OT",
            level1: data?.ot?.level1 || "",
            level2: data?.ot?.level2 || "",
            level3: data?.ot?.level3 || "",
            escalation_days: Number(data?.ot?.escalation_days || 0),
            delegate_role: String(data?.ot?.delegate_role || ""),
          },
          {
            module: "Payroll",
            level1: data?.payroll?.level1 || "",
            level2: data?.payroll?.level2 || "",
            level3: data?.payroll?.level3 || "",
            escalation_days: Number(data?.payroll?.escalation_days || 0),
            delegate_role: String(data?.payroll?.delegate_role || ""),
          },
        ]);
      } catch (error) {
        console.error("Failed to fetch approval flows:", error);
      }
    };

    fetchFlows();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await apiGet<any>("/users/roles");
        const rows = Array.isArray(res) ? res : res?.data || [];
        const names = rows.map((row: any) => String(row.role_name || row.name || "")).filter(Boolean);
        setRoleOptions(Array.from(new Set(names)));
      } catch (error) {
        console.error("Failed to fetch roles for approval flow:", error);
      }
    };

    fetchRoles();
  }, []);

  const updateField = (
    index: number,
    field: "level1" | "level2" | "level3" | "delegate_role" | "escalation_days",
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (field === "escalation_days") {
          return { ...r, escalation_days: Math.max(0, Number(value || 0)) };
        }
        return { ...r, [field]: value };
      })
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const flowMap = {
        leave: rows.find((row) => row.module === "Leave"),
        ot: rows.find((row) => row.module === "OT"),
        payroll: rows.find((row) => row.module === "Payroll"),
      };
      await apiPut("/admin/approval-flows", { flowMap });
      window.alert("Saved approval flow");
    } catch (error: any) {
      window.alert(error?.message || "Failed to save approval flow");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{t("approvalFlow.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("approvalFlow.subtitle")}</p>
          </div>
          <Badge variant="outline">{isSystemAdmin ? t("approvalFlow.badgeSystemAdmin") : t("approvalFlow.badgeCentralHr")}</Badge>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("approvalFlow.table.module")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("approvalFlow.table.level1")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("approvalFlow.table.level2")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("approvalFlow.table.level3")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Escalation (days)</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Delegate Role</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.module} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{t(`approvalFlow.module.${row.module.toLowerCase()}`, row.module)}</td>
                  <td className="px-4 py-3">
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={row.level1} onChange={(e) => updateField(index, "level1", e.target.value)}>
                      <option value="">-</option>
                      {roleOptions.map((roleName) => (
                        <option key={`l1-${row.module}-${roleName}`} value={roleName}>{roleName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={row.level2} onChange={(e) => updateField(index, "level2", e.target.value)}>
                      <option value="">-</option>
                      {roleOptions.map((roleName) => (
                        <option key={`l2-${row.module}-${roleName}`} value={roleName}>{roleName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={row.level3} onChange={(e) => updateField(index, "level3", e.target.value)}>
                      <option value="">-</option>
                      {roleOptions.map((roleName) => (
                        <option key={`l3-${row.module}-${roleName}`} value={roleName}>{roleName}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      value={Number(row.escalation_days || 0)}
                      onChange={(e) => updateField(index, "escalation_days", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={row.delegate_role || ""}
                      onChange={(e) => updateField(index, "delegate_role", e.target.value)}
                    >
                      <option value="">-</option>
                      {roleOptions.map((roleName) => (
                        <option key={`delegate-${row.module}-${roleName}`} value={roleName}>{roleName}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave} disabled={!isSystemAdmin || saving}>{saving ? "Saving..." : t("approvalFlow.save")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
