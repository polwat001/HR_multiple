"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompany } from "@/contexts/CompanyContexts";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Permission, UserRole } from "@/types/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Filter, Plus, Pencil, Trash2 } from "lucide-react";
import { apiDelete, apiGet } from "@/lib/api";
import { resolveRoleViewKey } from "@/lib/accessMatrix";

// 1. Interface
interface Employee {
  id: string;
  avatar_url?: string;
  employee_code: string;
  firstname_th: string;
  lastname_th: string;
  position_name?: string;
  department_name?: string;
  company_name?: string;
  status?: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  probation: "bg-warning/10 text-warning border-warning/20",
  resigned: "bg-destructive/10 text-destructive border-destructive/20",
  inactive: "bg-destructive/10 text-destructive border-destructive/20",
};

const EmployeeList = () => {
  const { t } = useLanguage();
  const { selectedCompany } = useCompany();
  const { hasPermission, hasRole, user } = useAuth();
  const roleViewKey = resolveRoleViewKey(user as any);
  const isManagerView = roleViewKey === "manager";
  const ownUserId = String((user as any)?.user_id || "");
  const searchParams = useSearchParams();
  const router = useRouter();
  const canManageEmployees =
    hasPermission(Permission.MANAGE_COMPANY_EMPLOYEES) ||
    hasPermission(Permission.MANAGE_ALL_EMPLOYEES);
  const canTransferCrossCompany = hasRole(UserRole.CENTRAL_HR);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // 2. ดึงข้อมูลจาก API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const empData = await apiGet<any>("/employees");
        setEmployees(Array.isArray(empData) ? empData : empData?.data || []);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 3. ระบบ Filter
  const companyFilter = searchParams.get("company") || selectedCompany.id;

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      if (isManagerView && ownUserId && String((emp as any).user_id || "") === ownUserId) return false;

      const empCompId = String((emp as any).company_id || (emp as any).companyId || "");
      const targetCompId = String(companyFilter).replace("company-", "");
      
      if (companyFilter !== "all" && empCompId && empCompId !== targetCompId) return false;
      if (deptFilter !== "all" && emp.department_name !== deptFilter) return false;
      
      if (search) {
        const q = search.toLowerCase();
        return (
          (emp.firstname_th?.toLowerCase().includes(q) ?? false) ||
          (emp.lastname_th?.toLowerCase().includes(q) ?? false) ||
          (emp.employee_code?.toLowerCase().includes(q) ?? false) ||
          (emp.position_name?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [employees, companyFilter, deptFilter, isManagerView, ownUserId, search]);

  // ดึงรายชื่อแผนกที่ไม่ซ้ำกัน
  const departments = useMemo(() => {
    return [...new Set(employees.map((e) => e.department_name))].filter((d): d is string => Boolean(d));
  }, [employees]);

  const handleDeleteEmployee = async (id: string) => {
    if (!canManageEmployees) return;
    if (!window.confirm(t("employeeList.deleteConfirm"))) return;

    try {
      await apiDelete(`/employees/${id}`);
      setEmployees((prev) => prev.filter((e) => String(e.id) !== String(id)));
    } catch (error) {
      console.error("Delete employee failed:", error);
      alert(t("employeeList.deleteFailed"));
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">{t("employeeList.loading")}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters Section */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("employeeList.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder={t("employeeList.allDepartments")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("employeeList.allDepartments")}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground ml-auto">
              {t("employeeList.foundCount").replace("{{count}}", String(filtered.length))}
            </div>

            {canManageEmployees && (
              <Button size="sm" className="gap-1.5" onClick={() => router.push("/employees/new")}>
                <Plus className="h-4 w-4" /> {t("employeeList.addEmployee")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-0 border-b bg-muted/10">
          <CardTitle className="text-base py-2">{t("employeeList.title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={120}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("employeeList.table.profile")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("employeeList.table.employeeCode")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("employeeList.table.fullName")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("employeeList.table.company")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("employeeList.table.department")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("employeeList.table.position")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("employeeList.table.status")}</th>
                    {(canManageEmployees || canTransferCrossCompany) && <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("employeeList.table.manage")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((emp) => {
                      return (
                        <tr
                          key={emp.id}
                          className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => router.push(`/employees/${emp.id}`)}
                        >
                          <td className="px-4 py-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex">
                                  {emp.avatar_url ? (
                                    <img
                                      src={emp.avatar_url}
                                      alt={`${emp.firstname_th} ${emp.lastname_th}`}
                                      className="h-9 w-9 rounded-full object-cover border"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded-full bg-muted text-muted-foreground border flex items-center justify-center text-xs font-semibold">
                                      {`${emp.firstname_th?.[0] || ""}${emp.lastname_th?.[0] || ""}`.toUpperCase() || "-"}
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="p-2">
                                {emp.avatar_url ? (
                                  <img
                                    src={emp.avatar_url}
                                    alt={`${emp.firstname_th} ${emp.lastname_th}`}
                                    className="h-28 w-28 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="h-28 w-28 rounded-md bg-muted text-muted-foreground border flex items-center justify-center text-3xl font-semibold">
                                    {`${emp.firstname_th?.[0] || ""}${emp.lastname_th?.[0] || ""}`.toUpperCase() || "-"}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{emp.employee_code || t("employeeList.na")}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{emp.firstname_th} {emp.lastname_th}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                              {emp.company_name || t("employeeList.na")}
                            </span>
                          </td>
                          <td className="px-4 py-3">{emp.department_name || t("employeeList.na")}</td>
                          <td className="px-4 py-3">{emp.position_name || t("employeeList.na")}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={statusStyles[emp.status?.toLowerCase() || ""] || ""}>
                              {emp.status || t("employeeList.na")}
                            </Badge>
                          </td>
                          {(canManageEmployees || canTransferCrossCompany) && (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-2">
                                {canManageEmployees ? (
                                  <>
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" title={t("employeeList.actions.edit")} onClick={() => router.push(`/employees/${emp.id}`)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="destructive" className="h-8 w-8 p-0" title={t("employeeList.actions.delete")} onClick={() => handleDeleteEmployee(String(emp.id))}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="sm" variant="outline">{t("employeeList.actions.transferCompany")}</Button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={(canManageEmployees || canTransferCrossCompany) ? 8 : 7} className="p-8 text-center text-muted-foreground">{t("employeeList.empty")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeList;