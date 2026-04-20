import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserRole } from "@/types/roles";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

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


  const fetchPositions = useCallback(async () => {
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
  }, []);
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleCreatePosition = async () => {
    const title = window.prompt("Position title (TH)");
    if (!title) return;
    const level = window.prompt("Position level (number)", "1") || "1";

    try {
      await apiPost("/organization/positions", {
        title_th: title,
        level: Number(level || 1),
      });
      await fetchPositions();
    } catch (error: any) {
      window.alert(error?.message || "Failed to create position");
    }
  };

  const handleEditPosition = async (row: PositionRow) => {
    const title = window.prompt("Position title (TH)", row.title || "");
    if (!title) return;
    const level = window.prompt("Position level (number)", row.level || "1") || row.level || "1";

    try {
      await apiPut(`/organization/positions/${row.id}`, {
        title_th: title,
        level: Number(level || 1),
      });
      await fetchPositions();
    } catch (error: any) {
      window.alert(error?.message || "Failed to update position");
    }
  };

  const handleDeletePosition = async (row: PositionRow) => {
    if (!window.confirm(`Delete position: ${row.title}?`)) return;
    try {
      await apiDelete(`/organization/positions/${row.id}`);
      await fetchPositions();
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete position");
    }
  };

  const positions = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-md rounded-2xl overflow-hidden border border-border/60">

        {/* ================= HEADER ================= */}
        <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b bg-muted/30">
          <CardTitle className="text-lg font-semibold tracking-tight">
            {t("positionMaster.title")}
          </CardTitle>

          {isSuperAdmin && (
            <Button
              size="sm"
              className="gap-1.5 shadow-sm"
              onClick={handleCreatePosition}
            >
              <Plus className="h-4 w-4" />
              {t("positionMaster.add")}
            </Button>
          )}
        </CardHeader>

        {/* ================= TABLE ================= */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              {/* ================= HEADER ================= */}
              <thead>
                <tr className="bg-muted/40 border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-6 py-3">#</th>
                  <th className="text-left px-6 py-3">{t("positionMaster.table.position")}</th>
                  <th className="text-left px-6 py-3">{t("positionMaster.table.level")}</th>
                  <th className="text-left px-6 py-3">{t("positionMaster.table.companies")}</th>
                  <th className="text-left px-6 py-3">{t("positionMaster.table.status")}</th>
                  {isSuperAdmin && <th className="text-left px-6 py-3">Action</th>}
                </tr>
              </thead>

              {/* ================= BODY ================= */}
              <tbody className="divide-y">

                {/* Loading */}
                {loading && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-10 text-center text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                )}

                {/* Empty */}
                {!loading && positions.length === 0 && (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-10 text-center text-muted-foreground">
                      No position data
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {positions.map((p) => (
                  <tr
                    key={p.id}
                    className="group hover:bg-muted/30 transition-all duration-200"
                  >
                    {/* Index */}
                    <td className="px-6 py-4 text-muted-foreground font-medium">
                      {p.id}
                    </td>

                    {/* Title */}
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {p.title}
                    </td>

                    {/* Level */}
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-md bg-muted">
                        {p.level}
                      </span>
                    </td>

                    {/* Companies */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {p.companies.map((c) => (
                          <Badge
                            key={c}
                            variant="secondary"
                            className="text-xs px-2 py-0.5 rounded-full"
                          >
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge
                        variant={p.status === "active" ? "default" : "secondary"}
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          p.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {t(`positionMaster.status.${p.status}`, p.status)}
                      </Badge>
                    </td>

                    {/* Actions */}
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditPosition(p)}
                            className="h-8 w-8 text-blue-500 hover:bg-blue-500/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeletePosition(p)}
                            className="h-8 w-8 text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
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
