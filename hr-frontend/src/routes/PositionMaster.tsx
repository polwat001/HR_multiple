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

type PositionApiRow = {
  id?: number | string;
  title_th?: string;
  title?: string;
  position_name?: string;
  level?: string | number;
  position_level?: string | number;
  company_name?: string;
  department_name?: string;
  department_id?: string | number;
};

type CompanyRow = {
  id: string | number;
  company_name?: string;
  company_code?: string;
};

type DepartmentRow = {
  id: string | number;
  department_name?: string;
  company_id?: string | number;
};

const level: Record<string, string> = {
  1: "bg-sky-100 text-sky-700 border-sky-200",
  2: "bg-emerald-100 text-emerald-700 border-emerald-200",
  3: "bg-amber-100 text-amber-700 border-amber-200",
  4: "bg-violet-100 text-violet-700 border-violet-200",
  5: "bg-rose-100 text-rose-700 border-rose-200",
  6: "bg-cyan-100 text-cyan-700 border-cyan-200",
  7: "bg-lime-100 text-lime-700 border-lime-200",
  8: "bg-orange-100 text-orange-700 border-orange-200",
};

const getLevelKey = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "1";
  if (normalized.startsWith("l")) return normalized.slice(1) || "1";
  return normalized;
};

const getLevelLabel = (value: unknown) => {
  const normalized = getLevelKey(value);
  return normalized.toUpperCase().startsWith("L") ? normalized.toUpperCase() : `L${normalized}`;
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
      const [positionRes, departmentRes, companyRes] = await Promise.all([
        apiGet<PositionApiRow[] | { data?: PositionApiRow[] }>("/organization/positions"),
        apiGet<DepartmentRow[] | { data?: DepartmentRow[] }>("/organization/departments"),
        apiGet<CompanyRow[] | { data?: CompanyRow[] }>("/organization/companies"),
      ]);
      const items = Array.isArray(positionRes) ? positionRes : positionRes?.data || [];
      const departments: DepartmentRow[] = Array.isArray(departmentRes) ? departmentRes : departmentRes?.data || [];
      const companies: CompanyRow[] = Array.isArray(companyRes) ? companyRes : companyRes?.data || [];
      const departmentMap = new Map(departments.map((department) => [String(department.id), department]));
      const companyMap = new Map(companies.map((company) => [String(company.id), company]));

      setRows(
        items.map((item) => ({
          id: Number(item.id),
          title: String(item.position_name || item.title_th || item.title || "-"),
          level: getLevelLabel(item.level || item.position_level || "1"),
          companies: (() => {
            const department = departmentMap.get(String(item.department_id || ""));
            const company = department ? companyMap.get(String(department.company_id || "")) : null;
            const companyName = String(company?.company_name || company?.company_code || item.company_name || "-");
            const departmentName = String(department?.department_name || item.department_name || "-");
            return companyName === "-" ? [departmentName] : [companyName, departmentName];
          })(),
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
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "Failed to create position");
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
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "Failed to update position");
    }
  };

  const handleDeletePosition = async (row: PositionRow) => {
    if (!window.confirm(`Delete position: ${row.title}?`)) return;
    try {
      await apiDelete(`/organization/positions/${row.id}`);
      await fetchPositions();
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : "Failed to delete position");
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
                      <Badge
                        variant="outline"
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${level[getLevelKey(p.level)] || "bg-slate-100 text-slate-700 border-slate-200"}`}
                      >
                        {p.level}
                      </Badge>
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
