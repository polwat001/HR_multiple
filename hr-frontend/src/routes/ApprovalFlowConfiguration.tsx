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
  { module: "Leave", level1: "", level2: "", level3: "" },
  { module: "OT", level1: "", level2: "", level3: "" },
  { module: "Payroll", level1: "", level2: "", level3: "" },
];

export default function ApprovalFlowConfiguration() {
  const { hasRole } = useAuth();
  const { t } = useLanguage();
  const isSystemAdmin = hasRole(UserRole.SUPER_ADMIN);
  const [rows, setRows] = useState(emptyFlowRows);
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
          },
          {
            module: "OT",
            level1: data?.ot?.level1 || "",
            level2: data?.ot?.level2 || "",
            level3: data?.ot?.level3 || "",
          },
          {
            module: "Payroll",
            level1: data?.payroll?.level1 || "",
            level2: data?.payroll?.level2 || "",
            level3: data?.payroll?.level3 || "",
          },
        ]);
      } catch (error) {
        console.error("Failed to fetch approval flows:", error);
      }
    };

    fetchFlows();
  }, []);

  const updateField = (index: number, field: "level1" | "level2" | "level3", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
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
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.module} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{t(`approvalFlow.module.${row.module.toLowerCase()}`, row.module)}</td>
                  <td className="px-4 py-3"><Input value={row.level1} onChange={(e) => updateField(index, "level1", e.target.value)} /></td>
                  <td className="px-4 py-3"><Input value={row.level2} onChange={(e) => updateField(index, "level2", e.target.value)} /></td>
                  <td className="px-4 py-3"><Input value={row.level3} onChange={(e) => updateField(index, "level3", e.target.value)} /></td>
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
