import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/roles";
import { apiGet } from "@/lib/api";

type PositionRow = {
  id: number;
  title: string;
  level: string;
  companies: string[];
  status: "active" | "inactive";
};

const PositionMaster = () => {
  const { hasRole } = useAuth();
  const { t } = useLanguage();
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);
  const [rows, setRows] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPositions = async () => {
      try {
        setLoading(true);
        const res = await apiGet<any>("/organization/positions");
        const items = Array.isArray(res) ? res : res?.data || [];
        setRows(
          items.map((item: any) => ({
            id: Number(item.id),
            title: String(item.title_th || item.title || "-"),
            level: String(item.level || "-"),
            companies: [String(item.company_name || "-")],
            status: "active" as const,
          }))
        );
      } catch (error) {
        console.error("Failed to fetch positions:", error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, []);

  const positions = useMemo(() => rows, [rows]);

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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No position data</td>
                </tr>
              ) : null}
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
