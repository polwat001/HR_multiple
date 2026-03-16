import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/roles";

const initialFlowRows = [
  { module: "Leave", level1: "Manager", level2: "HR Company", level3: "Central HR" },
  { module: "OT", level1: "Manager", level2: "HR Company", level3: "Central HR" },
  { module: "Payroll", level1: "HR Company", level2: "Central HR", level3: "-" },
];

export default function ApprovalFlowConfiguration() {
  const { hasRole } = useAuth();
  const { t } = useLanguage();
  const isSystemAdmin = hasRole(UserRole.SUPER_ADMIN);
  const [rows, setRows] = useState(initialFlowRows);

  const updateField = (index: number, field: "level1" | "level2" | "level3", value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
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
            <Button>{t("approvalFlow.save")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
