import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/roles";

const positions = [
  { id: 1, title: "HR Director", level: "Executive", companies: ["ABC", "XYZ", "DEF"], status: "active" },
  { id: 2, title: "HR Manager", level: "Manager", companies: ["ABC", "XYZ", "DEF"], status: "active" },
  { id: 3, title: "HR Officer", level: "Staff", companies: ["ABC", "XYZ"], status: "active" },
  { id: 4, title: "IT Support", level: "Staff", companies: ["ABC"], status: "active" },
  { id: 5, title: "Senior Developer", level: "Senior", companies: ["ABC", "DEF"], status: "active" },
  { id: 6, title: "Production Manager", level: "Manager", companies: ["DEF"], status: "active" },
  { id: 7, title: "Accounting Manager", level: "Manager", companies: ["ABC", "XYZ"], status: "active" },
  { id: 8, title: "QA Engineer", level: "Staff", companies: ["DEF"], status: "active" },
  { id: 9, title: "Marketing Manager", level: "Manager", companies: ["ABC"], status: "active" },
  { id: 10, title: "Sales Executive", level: "Staff", companies: ["XYZ"], status: "inactive" },
];

const PositionMaster = () => {
  const { hasRole } = useAuth();
  const { t } = useLanguage();
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);

  return (
  <div className="space-y-6 animate-fade-in">
    <Card className="shadow-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t("positionMaster.title")}</CardTitle>
        {isSuperAdmin && (
          <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> {t("positionMaster.add")}</Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("positionMaster.table.index")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("positionMaster.table.position")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("positionMaster.table.level")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("positionMaster.table.companies")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("positionMaster.table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{p.id}</td>
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3">{p.level}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {p.companies.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs">
                      {t(`positionMaster.status.${p.status}`, p.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
  );
};

export default PositionMaster;
