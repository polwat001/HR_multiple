"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import { Search, Filter, Plus, Pencil, Trash2, Table } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
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

interface SavedFilter {
  id: string;
  name: string;
  search: string;
  deptFilter: string;
  statusFilter: string;
}

interface ImportResultRow {
  row: number;
  employee_code: string;
  ok: boolean;
  message: string;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  probation: "bg-yellow-100 text-yellow-700 border-yellow-200",
  inactive: "bg-gray-100 text-gray-600 border-gray-200",
  resigned: "bg-red-100 text-red-600 border-red-200",
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [savedFilterName, setSavedFilterName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [importResults, setImportResults] = useState<ImportResultRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const savedFilterStorageKey = useMemo(() => {
    const uid = String((user as any)?.user_id || "anonymous");
    return `employee_list_saved_filters_${uid}`;
  }, [user]);

  // 2. ดึงข้อมูลจาก API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ดึงข้อมูลจริงจาก API จริง
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(savedFilterStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedFilters(
          parsed.filter((f) => typeof f?.id === "string" && typeof f?.name === "string")
        );
      }
    } catch (error) {
      console.error("Failed to load saved employee filters", error);
    }
  }, [savedFilterStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(savedFilterStorageKey, JSON.stringify(savedFilters));
    } catch (error) {
      console.error("Failed to persist saved employee filters", error);
    }
  }, [savedFilterStorageKey, savedFilters]);

  // 3. ระบบ Filter
  const companyFilter = searchParams.get("company") || selectedCompany.id;

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      if (isManagerView && ownUserId && String((emp as any).user_id || "") === ownUserId) return false;

      const empCompId = String((emp as any).company_id || (emp as any).companyId || "");
      const targetCompId = String(companyFilter).replace("company-", "");
      
      if (companyFilter !== "all" && empCompId && empCompId !== targetCompId) return false;
      if (deptFilter !== "all" && emp.department_name !== deptFilter) return false;
      if (statusFilter !== "all" && String(emp.status || "").toLowerCase() !== statusFilter) return false;
      
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
  }, [employees, companyFilter, deptFilter, isManagerView, ownUserId, search, statusFilter]);

  // ดึงรายชื่อแผนกที่ไม่ซ้ำกัน
  const departments = useMemo(() => {
    return [...new Set(employees.map((e) => e.department_name))].filter((d): d is string => Boolean(d));
  }, [employees]);

  const visibleIdSet = useMemo(() => new Set(filtered.map((emp) => String(emp.id))), [filtered]);
  const allVisibleSelected = filtered.length > 0 && filtered.every((emp) => selectedIds.includes(String(emp.id)));
  const selectedCount = selectedIds.length;

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => visibleIdSet.has(id)));
  }, [visibleIdSet]);

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

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIdSet.has(id)));
      return;
    }
    const merged = new Set([...selectedIds, ...filtered.map((emp) => String(emp.id))]);
    setSelectedIds(Array.from(merged));
  };

  const exportSelectedCsv = () => {
    const selectedRows = filtered.filter((emp) => selectedIds.includes(String(emp.id)));
    if (!selectedRows.length) {
      alert("กรุณาเลือกรายการก่อน Export");
      return;
    }

    const headers = ["employee_code", "firstname_th", "lastname_th", "company_name", "department_name", "position_name", "status"];
    const escapeCsv = (value: unknown) => {
      const text = String(value ?? "").replace(/"/g, '""');
      return `"${text}"`;
    };
    const lines = [
      headers.join(","),
      ...selectedRows.map((row) => headers.map((key) => escapeCsv((row as any)[key])).join(",")),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `employees_selected_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deleteSelectedEmployees = async () => {
    if (!canManageEmployees) return;
    const ids = filtered.map((emp) => String(emp.id)).filter((id) => selectedIds.includes(id));
    if (!ids.length) {
      alert("กรุณาเลือกรายการก่อนลบ");
      return;
    }

    if (!window.confirm(`ยืนยันลบพนักงานที่เลือก ${ids.length} รายการ?`)) return;

    try {
      for (const id of ids) {
        await apiDelete(`/employees/${id}`);
      }
      setEmployees((prev) => prev.filter((emp) => !ids.includes(String(emp.id))));
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } catch (error) {
      console.error("Bulk delete employee failed:", error);
      alert("ลบข้อมูลบางรายการไม่สำเร็จ");
    }
  };

  const saveCurrentFilter = () => {
    const name = savedFilterName.trim();
    if (!name) {
      alert("กรุณาตั้งชื่อ Saved Filter");
      return;
    }
    const newRow: SavedFilter = {
      id: `${Date.now()}`,
      name,
      search,
      deptFilter,
      statusFilter,
    };
    setSavedFilters((prev) => [newRow, ...prev].slice(0, 20));
    setSavedFilterName("");
  };

  const applySavedFilter = (id: string) => {
    if (id === "none") return;
    const found = savedFilters.find((f) => f.id === id);
    if (!found) return;
    setSearch(found.search);
    setDeptFilter(found.deptFilter);
    setStatusFilter(found.statusFilter);
  };

  const removeSavedFilter = (id: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const triggerImportFile = () => {
    fileInputRef.current?.click();
  };

  const downloadTemplateCsv = () => {
    const headers = [
      "employee_code",
      "firstname_th",
      "lastname_th",
      "company_id",
      "department_id",
      "position_id",
      "manager_id",
      "employee_type",
      "status",
      "phone",
      "email",
    ];
    const sample = [
      "E9001",
      "สมชาย",
      "ใจดี",
      "1",
      "2",
      "4",
      "3",
      "full_time",
      "active",
      "0812345678",
      "somchai@example.com",
    ];
    const content = [headers.join(","), sample.join(",")].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "employee_import_template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const [showFilters, setShowFilters] = useState(false);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportSummary(null);
      setImportResults([]);

      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length < 2) {
        alert("ไฟล์ CSV ไม่มีข้อมูลสำหรับ import");
        return;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const required = ["employee_code", "firstname_th", "lastname_th"];
      const missing = required.filter((key) => !headers.includes(key));
      if (missing.length > 0) {
        alert(`CSV ขาดคอลัมน์จำเป็น: ${missing.join(", ")}`);
        return;
      }

      const toNumberOrUndefined = (value: string | undefined) => {
        const n = Number(String(value || "").trim());
        return Number.isFinite(n) && n > 0 ? n : undefined;
      };

      const results: ImportResultRow[] = [];
      let success = 0;

      for (let i = 1; i < lines.length; i += 1) {
        const cols = parseCsvLine(lines[i]);
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || "";
        });

        const employeeCode = String(rowObj.employee_code || "").trim();
        const firstname = String(rowObj.firstname_th || "").trim();
        const lastname = String(rowObj.lastname_th || "").trim();

        if (!employeeCode || !firstname || !lastname) {
          results.push({
            row: i + 1,
            employee_code: employeeCode || "-",
            ok: false,
            message: "ข้อมูลจำเป็นไม่ครบ (employee_code / firstname_th / lastname_th)",
          });
          continue;
        }

        const companyFromSelected = Number(String(selectedCompany?.id || "").replace("company-", ""));
        const payload: Record<string, unknown> = {
          employee_code: employeeCode,
          firstname_th: firstname,
          lastname_th: lastname,
          company_id:
            toNumberOrUndefined(rowObj.company_id) ||
            (Number.isFinite(companyFromSelected) && companyFromSelected > 0 ? companyFromSelected : undefined),
          department_id: toNumberOrUndefined(rowObj.department_id),
          position_id: toNumberOrUndefined(rowObj.position_id),
          manager_id: toNumberOrUndefined(rowObj.manager_id),
          employee_type: String(rowObj.employee_type || "full_time").trim() || "full_time",
          status: String(rowObj.status || "active").trim() || "active",
          phone: String(rowObj.phone || "").trim() || undefined,
          email: String(rowObj.email || "").trim() || undefined,
        };

        try {
          await apiPost<any>("/employees", payload);
          success += 1;
          results.push({ row: i + 1, employee_code: employeeCode, ok: true, message: "นำเข้าสำเร็จ" });
        } catch (error: any) {
          results.push({
            row: i + 1,
            employee_code: employeeCode,
            ok: false,
            message: String(error?.message || "นำเข้าไม่สำเร็จ"),
          });
        }
      }

      setImportResults(results);
      setImportSummary({ total: lines.length - 1, success, failed: lines.length - 1 - success });

      const empData = await apiGet<any>("/employees");
      setEmployees(Array.isArray(empData) ? empData : empData?.data || []);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

  };

  if (isLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">{t("employeeList.loading")}</div>;

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-3">
        {/* Left: Title */}
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
          พนักงาน
        </h1>

        {/* Right: Actions */}
        {canManageEmployees && (
          <div className="flex items-center gap-2 flex-wrap">

          {/* Export */}
          <Button
            size="sm"
            variant="ghost"
            onClick={downloadTemplateCsv}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium shadow-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v13"></path>
              <path d="m16 6-4-4-4 4"></path>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            </svg>
            ส่งออกข้อมูล
          </Button>

          {/* Import */}
          <Button
            size="sm"
            variant="ghost"
            onClick={triggerImportFile}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium shadow-none disabled:opacity-60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="rotate-180"
            >
              <path d="M12 2v13"></path>
              <path d="m16 6-4-4-4 4"></path>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            </svg>
            {importing ? "Importing..." : "นำเข้าข้อมูล"}
          </Button>

            {/* Add Employee */}
            <Button
              size="sm"
              onClick={() => router.push("/employees/new")}
              className="flex items-center gap-2 px-4 py-2.5 border-blue-700 bg-blue-500 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-none disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {t("employeeList.addEmployee")}
            </Button>

          </div>
        )}

      </div>

        {/* Filters Section */}
          <CardContent className="p-4 space-y-4">

            {/* Top Bar */}
            <div className="flex flex-wrap items-center gap-3">

              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t("employeeList.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              {/* Filter Button */}
              <Button
                size="sm"
                variant="outline"
                className="gap-2 rounded-xl border-slate-200 hover:bg-slate-100"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <Filter className="h-4 w-4" />
                {showFilters ? "Hide" : "Filters"}
              </Button>

              {/* Count */}
              <div className="text-sm text-slate-500 ml-auto font-medium">
                {filtered.length} รายการ
              </div>
            </div>

            {/* Expand Filters */}
            {showFilters && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            {/* LEFT: Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              
              {/* Department */}
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl border-slate-200">
                  <SelectValue placeholder="แผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกแผนก</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10 rounded-xl border-slate-200">
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-3 flex-wrap">

              {/* Save Filter */}
              <div className="flex items-center gap-2">
                <Input
                  className="w-[180px] h-10 rounded-xl border-slate-200"
                  placeholder="ตั้งชื่อ filter"
                  value={savedFilterName}
                  onChange={(e) => setSavedFilterName(e.target.value)}
                />
                <Button
                  size="sm"
                  className="h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={saveCurrentFilter}
                >
                  Save
                </Button>
              </div>

              {/* Saved Filter */}
              <Select onValueChange={applySavedFilter} value="none">
                <SelectTrigger className="w-[180px] h-10 rounded-xl border-slate-200">
                  <SelectValue placeholder="Saved Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">เลือก Saved Filter</SelectItem>
                  {savedFilters.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

          </div>
            )}

            {/* Saved Filter Chips */}
            {savedFilters.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">

                {savedFilters.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-medium transition"
                  >
                    <button
                      type="button"
                      onClick={() => applySavedFilter(f.id)}
                      className="hover:text-blue-600"
                    >
                      {f.name}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeSavedFilter(f.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}

              </div>
            )}

          </CardContent>
      
      {importSummary && (
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Import Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Total: {importSummary.total} | Success: {importSummary.success} | Failed: {importSummary.failed}
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Employee Code</th>
                    <th className="px-3 py-2">Result</th>
                    <th className="px-3 py-2">Message</th>
                  </tr>
                </thead>

                <tbody>
                  {importResults.map((r) => (
                    <tr key={`${r.row}-${r.employee_code}`} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{r.row}</td>
                      <td className="px-3 py-2 font-mono">{r.employee_code}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={r.ok ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                          {r.ok ? "OK" : "FAIL"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{r.message}</td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          </CardContent>
        </Card>
        
      )}

      {/* Table Section */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b bg-muted/10">
          {/* Left: Title */}
          <CardTitle className="text-base">
            {t("employeeList.title")}
          </CardTitle>

          <div className="flex items-center justify-end gap-2 flex-wrap">

            {/* Divider */}
            <div className="h-5 w-px bg-border mx-1" />

            {/* Actions */}
            <Button
              size="sm"
              variant="outline"
              onClick={exportSelectedCsv}
              disabled={selectedCount === 0}
            >
              Export
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds([])}
              disabled={selectedCount === 0}
            >
              Clear
            </Button>
            {canManageEmployees && (
              <Button
                size="sm"
                variant="outline"
                className="shadow-sm border-red-300 text-red-600 hover:bg-red-50"
                onClick={deleteSelectedEmployees}
                disabled={selectedCount === 0}
              >
                Delete
              </Button>
            )}
          </div>

        </CardHeader>

        {/*Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={120}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
                    </th>
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
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(String(emp.id))}
                              onChange={() => toggleRowSelection(String(emp.id))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex">
                                  {emp.avatar_url ? (
                                    <img
                                      src={emp.avatar_url}
                                      alt={`${emp.firstname_th} ${emp.lastname_th}`}
                                      className="h-9 w-9 rounded-full object-cover shadow-sm"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm flex items-center justify-center text-xs font-semibold">
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
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                      title={t("employeeList.actions.edit")}
                                      onClick={() => router.push(`/employees/${emp.id}`)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                      title={t("employeeList.actions.delete")}
                                      onClick={() => handleDeleteEmployee(String(emp.id))}
                                    >
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
                      <td colSpan={(canManageEmployees || canTransferCrossCompany) ? 9 : 8} className="p-8 text-center text-muted-foreground">{t("employeeList.empty")}</td>
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