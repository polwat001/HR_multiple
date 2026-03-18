"use client";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Building2, Building, GitBranch, FolderOpen, Briefcase, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";
import { resolveRoleViewKey } from "@/lib/accessMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const typeConfig: Record<string, { icon: any; color: string }> = {
  group: { icon: Building2, color: "text-primary" },
  company: { icon: Building, color: "text-accent" },
  branch: { icon: GitBranch, color: "text-warning" },
  department: { icon: FolderOpen, color: "text-info" },
  position: { icon: Briefcase, color: "text-purple-600" },
};

interface OrgNode {
  id: string;
  rawId: string;
  NAME: string;
  type: string;
  companyId?: string;
  departmentId?: string;
  costCenter?: string;
  children: OrgNode[];
}

interface Company {
  id: string;
  code: string;
  name_th: string;
  name_en?: string;
  tax_id?: string;
  logo_url?: string;
  address?: string;
  phone?: string;
}

interface Department {
  id: string;
  code: string;
  name_th: string;
  company_id?: string;
  company_name?: string;
  parent_dept_id?: string | null;
  cost_center?: string;
}

interface Position {
  id: string;
  code?: string;
  title_th: string;
  level?: string;
  company_id?: string;
  company_name?: string;
  department_id?: string;
}

type DragPayload = {
  sourceType: "department" | "position";
  sourceId: string;
  sourceCompanyId?: string;
};

type TreeNodeProps = {
  node: OrgNode;
  level?: number;
  canManageOrg: boolean;
  onMoveDepartment: (sourceDepartmentId: string, targetParentDepartmentId: string | null, targetCompanyId: string) => Promise<void>;
  onMovePosition: (sourcePositionId: string, targetDepartmentId: string | null, targetCompanyId: string) => Promise<void>;
};

const TreeNode = ({ node, level = 0, canManageOrg, onMoveDepartment, onMovePosition }: TreeNodeProps) => {
  const [expanded, setExpanded] = useState(level < 2);
  const [isDropActive, setIsDropActive] = useState(false);
  const config = typeConfig[node.type] || typeConfig.department;
  const Icon = config.icon;
  const hasChildren = node.children && node.children.length > 0;

  const canDrag = canManageOrg && (node.type === "department" || node.type === "position");
  const canDrop = canManageOrg && (node.type === "company" || node.type === "department");

  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    const payload: DragPayload = {
      sourceType: node.type as "department" | "position",
      sourceId: node.rawId,
      sourceCompanyId: node.companyId,
    };
    event.dataTransfer.setData("application/org-node", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canDrop) return;
    event.preventDefault();
    setIsDropActive(true);
  };

  const onDragLeave = () => {
    if (!canDrop) return;
    setIsDropActive(false);
  };

  const onDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (!canDrop) return;
    event.preventDefault();
    setIsDropActive(false);

    const raw = event.dataTransfer.getData("application/org-node");
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as DragPayload;
      if (!payload?.sourceId || !payload?.sourceType) return;

      const targetCompanyId = node.type === "company" ? (node.rawId || "") : (node.companyId || "");
      if (!targetCompanyId) return;

      if (payload.sourceType === "department") {
        if (payload.sourceId === node.rawId) return;
        const targetParentDepartmentId = node.type === "department" ? node.rawId : null;
        await onMoveDepartment(payload.sourceId, targetParentDepartmentId, targetCompanyId);
      } else if (payload.sourceType === "position") {
        const targetDepartmentId = node.type === "department" ? node.rawId : null;
        await onMovePosition(payload.sourceId, targetDepartmentId, targetCompanyId);
      }
    } catch (dropError) {
      console.error("Drop parse error", dropError);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors",
          isDropActive && "ring-1 ring-primary bg-primary/5",
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => setExpanded(!expanded)}
        draggable={canDrag}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
        <span className="text-sm font-medium">{node.NAME}</span>
        {node.costCenter && (
          <span className="text-xs text-muted-foreground ml-auto">{node.costCenter}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              canManageOrg={canManageOrg}
              onMoveDepartment={onMoveDepartment}
              onMovePosition={onMovePosition}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const OrganizationStructure = () => {
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { hasRole, hasPermission, user } = useAuth();
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);
  const canManageOrg = hasPermission(Permission.MANAGE_ORGANIZATION) || isSuperAdmin;
  const roleViewKey = resolveRoleViewKey(user as any);
  const isEmployeeView = roleViewKey === "employee";
  const canUseMasterTabs =
    roleViewKey === "hr_company" ||
    roleViewKey === "central_hr" ||
    roleViewKey === "super_admin";
  const canManageCompanyMaster = roleViewKey === "central_hr" || roleViewKey === "super_admin";

  const [data, setData] = useState<OrgNode | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [companyForm, setCompanyForm] = useState({
    code: "",
    name_th: "",
    name_en: "",
    tax_id: "",
    logo_url: "",
    address: "",
    phone: "",
  });
  const [departmentForm, setDepartmentForm] = useState({
    code: "",
    name_th: "",
    company_id: "",
    parent_dept_id: "",
    cost_center: "",
  });
  const [positionForm, setPositionForm] = useState({
    code: "",
    title_th: "",
    level: "Staff",
    company_id: "",
    department_id: "",
  });

  const [activeTab, setActiveTab] = useState(isEmployeeView ? "org-chart" : "companies");
  const resolveTabFromPath = (pathname: string) => {
    if (pathname.endsWith("/organization/division")) return "division";
    if (pathname.endsWith("/organization/section")) return "section";
    if (pathname.endsWith("/organization/department")) return "department";
    if (pathname.endsWith("/organization/position")) return "position";
    if (pathname.endsWith("/organization/level")) return "level";
    if (pathname.endsWith("/organization")) return isEmployeeView ? "org-chart" : "all";
    return "";
  };

  useEffect(() => {
    const requestedTab = resolveTabFromPath(router.pathname || "");
    if (!requestedTab) return;
    if (!canUseMasterTabs && requestedTab !== "org-chart") {
      setActiveTab("org-chart");
      return;
    }
    setActiveTab(requestedTab);
  }, [router.pathname, canUseMasterTabs, isEmployeeView]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    type: "department" | "position";
    id: string;
    label: string;
  }>({ open: false, type: "department", id: "", label: "" });

  const normalizeRows = <T,>(raw: any): T[] => {
    if (Array.isArray(raw)) return raw as T[];
    if (Array.isArray(raw?.data)) return raw.data as T[];
    return [];
  };

  const buildTree = (companyRows: Company[], deptRows: Department[], positionRows: Position[]): OrgNode => {
    const companyNodes: OrgNode[] = companyRows.map((c) => {
      const deptsInCompany = deptRows.filter((d) => {
        if (d.company_id) return String(d.company_id) === String(c.id);
        if (d.company_name) return d.company_name === c.name_th;
        return true;
      });

      const deptNodeMap = new Map<string, OrgNode>();
      deptsInCompany.forEach((d) => {
        deptNodeMap.set(String(d.id), {
          id: `dept-${d.id}`,
          rawId: String(d.id),
          NAME: `${d.name_th}${d.cost_center ? ` (${d.cost_center})` : ""}`,
          type: "department",
          companyId: String(d.company_id || c.id),
          departmentId: String(d.id),
          costCenter: d.cost_center,
          children: [],
        });
      });

      const rootDeptNodes: OrgNode[] = [];
      deptsInCompany.forEach((d) => {
        const current = deptNodeMap.get(String(d.id));
        if (!current) return;
        const parentId = d.parent_dept_id ? String(d.parent_dept_id) : "";
        const parent = parentId ? deptNodeMap.get(parentId) : null;
        if (parent) {
          parent.children.push(current);
        } else {
          rootDeptNodes.push(current);
        }
      });

      const positionsInCompany = positionRows.filter((p) => {
        if (p.company_id) return String(p.company_id) === String(c.id);
        if (p.company_name) return p.company_name === c.name_th;
        return true;
      });

      positionsInCompany.forEach((p) => {
        const posNode: OrgNode = {
          id: `position-${p.id}`,
          rawId: String(p.id),
          NAME: `${p.title_th}${p.level ? ` [${p.level}]` : ""}`,
          type: "position",
          companyId: String(p.company_id || c.id),
          departmentId: p.department_id ? String(p.department_id) : undefined,
          children: [],
        };

        if (p.department_id) {
          const deptParent = deptNodeMap.get(String(p.department_id));
          if (deptParent) {
            deptParent.children.push(posNode);
            return;
          }
        }

        rootDeptNodes.push(posNode);
      });

      return {
        id: `company-${c.id}`,
        rawId: String(c.id),
        NAME: `${c.name_th || c.code}${c.code ? ` (${c.code})` : ""}`,
        type: "company",
        companyId: String(c.id),
        costCenter: c.code,
        children: rootDeptNodes,
      };
    });

    return {
      id: "root",
      rawId: "root",
      NAME: "Organization",
      type: "group",
      children: companyNodes,
    };
  };

  const fetchData = async () => {
    try {
      const [companyRes, departmentRes, positionRes] = await Promise.all([
        apiGet<any>("/organization/companies"),
        apiGet<any>("/organization/departments"),
        apiGet<any>("/organization/positions"),
      ]);

      const companyRows = normalizeRows<Company>(companyRes);
      const deptRows = normalizeRows<Department>(departmentRes);
      const positionRows = normalizeRows<Position>(positionRes);

      setCompanies(companyRows);
      setDepartments(deptRows);
      setPositions(positionRows);
      setData(buildTree(companyRows, deptRows, positionRows));
      setError(null);
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error("Failed to fetch org structure:", fetchError);
      setError(errorMsg);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (isEmployeeView && activeTab !== "org-chart") {
      setActiveTab("org-chart");
    }
  }, [activeTab, isEmployeeView]);

  const departmentChildrenSet = useMemo(() => {
    const set = new Set<string>();
    departments.forEach((row) => {
      if (row.parent_dept_id) set.add(String(row.parent_dept_id));
    });
    return set;
  }, [departments]);

  const resolveDepartmentType = (row: Department): "division" | "section" | "department" => {
    if (!row.parent_dept_id) return "division";
    if (departmentChildrenSet.has(String(row.id))) return "section";
    return "department";
  };

  const divisionRows = useMemo(
    () => departments.filter((row) => resolveDepartmentType(row) === "division"),
    [departments, departmentChildrenSet],
  );
  const sectionRows = useMemo(
    () => departments.filter((row) => resolveDepartmentType(row) === "section"),
    [departments, departmentChildrenSet],
  );
  const departmentRows = useMemo(
    () => departments.filter((row) => resolveDepartmentType(row) === "department"),
    [departments, departmentChildrenSet],
  );

  const deptOptions = useMemo(() => departments.map((d) => ({ label: d.name_th, value: String(d.id) })), [departments]);
  const divisionOptions = useMemo(() => divisionRows.map((d) => ({ label: d.name_th, value: String(d.id) })), [divisionRows]);
  const sectionOptions = useMemo(() => sectionRows.map((d) => ({ label: d.name_th, value: String(d.id) })), [sectionRows]);

  const levelSummaries = useMemo(() => {
    const grouped = new Map<string, { level: string; count: number; companies: Set<string> }>();

    positions.forEach((row) => {
      const normalizedLevel = row.level === null || row.level === undefined ? "" : String(row.level);
      const level = normalizedLevel.trim() || "Unspecified";
      const existing = grouped.get(level) || { level, count: 0, companies: new Set<string>() };
      existing.count += 1;
      existing.companies.add(String(row.company_id || row.company_name || "unknown"));
      grouped.set(level, existing);
    });

    return Array.from(grouped.values())
      .map((row) => ({ level: row.level, count: row.count, companyCount: row.companies.size }))
      .sort((a, b) => a.level.localeCompare(b.level));
  }, [positions]);

  const handleAddCompany = () => {
    setMessage(t("organizationStructure.messages.companyAddedDemo"));
  };

  const resetDepartmentForm = () => {
    setDepartmentForm({ code: "", name_th: "", company_id: "", parent_dept_id: "", cost_center: "" });
    setEditingDepartmentId(null);
  };

  const resetPositionForm = () => {
    setPositionForm({ code: "", title_th: "", level: "Staff", company_id: "", department_id: "" });
    setEditingPositionId(null);
  };

  const handleAddDepartment = async () => {
    if (!departmentForm.code || !departmentForm.name_th) return;

    const isDivisionTab = activeTab === "division";
    const isSectionTab = activeTab === "section";
    const isDepartmentTab = activeTab === "department";

    if ((isSectionTab || isDepartmentTab) && !departmentForm.parent_dept_id) {
      toast({
        title: "Parent is required",
        description: isSectionTab ? "Section must belong to a division" : "Department must belong to a section",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        code: departmentForm.code,
        name_th: departmentForm.name_th,
        company_id: departmentForm.company_id || null,
        parent_dept_id: isDivisionTab ? null : (departmentForm.parent_dept_id || null),
        cost_center: departmentForm.cost_center || null,
      };

      if (editingDepartmentId) {
        await apiPut(`/organization/departments/${editingDepartmentId}`, payload);
      } else {
        await apiPost("/organization/departments", payload);
      }

      await fetchData();
      resetDepartmentForm();
      toast({
        title: editingDepartmentId ? "Department updated" : "Department created",
        description: departmentForm.name_th,
      });
    } catch (submitError: any) {
      toast({
        title: "Failed to save department",
        description: submitError?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDepartment = (row: Department) => {
    setEditingDepartmentId(String(row.id));
    setDepartmentForm({
      code: row.code || "",
      name_th: row.name_th || "",
      company_id: String(row.company_id || ""),
      parent_dept_id: String(row.parent_dept_id || ""),
      cost_center: row.cost_center || "",
    });
    setActiveTab(resolveDepartmentType(row));
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await apiDelete(`/organization/departments/${id}`);
      await fetchData();
      toast({ title: "Department deleted" });
    } catch (deleteError: any) {
      toast({
        title: "Failed to delete department",
        description: deleteError?.message || "Unexpected error",
        variant: "destructive",
      });
    }
  };

  const handleAddPosition = async () => {
    if (!positionForm.code || !positionForm.title_th) return;

    try {
      setSubmitting(true);
      if (editingPositionId) {
        await apiPut(`/organization/positions/${editingPositionId}`, {
          code: positionForm.code,
          title_th: positionForm.title_th,
          level: positionForm.level,
          company_id: positionForm.company_id || null,
          department_id: positionForm.department_id || null,
        });
      } else {
        await apiPost("/organization/positions", {
          code: positionForm.code,
          title_th: positionForm.title_th,
          level: positionForm.level,
          company_id: positionForm.company_id || null,
          department_id: positionForm.department_id || null,
        });
      }

      await fetchData();
      resetPositionForm();
      toast({
        title: editingPositionId ? "Position updated" : "Position created",
        description: positionForm.title_th,
      });
    } catch (submitError: any) {
      toast({
        title: "Failed to save position",
        description: submitError?.message || "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditPosition = (row: Position) => {
    setEditingPositionId(String(row.id));
    setPositionForm({
      code: row.code || "",
      title_th: row.title_th || "",
      level: row.level || "Staff",
      company_id: String(row.company_id || ""),
      department_id: String(row.department_id || ""),
    });
    setActiveTab("position");
  };

  const handleDeletePosition = async (id: string) => {
    try {
      await apiDelete(`/organization/positions/${id}`);
      await fetchData();
      toast({ title: "Position deleted" });
    } catch (deleteError: any) {
      toast({
        title: "Failed to delete position",
        description: deleteError?.message || "Unexpected error",
        variant: "destructive",
      });
    }
  };

  const handleMoveDepartment = async (sourceDepartmentId: string, targetParentDepartmentId: string | null, targetCompanyId: string) => {
    const source = departments.find((d) => String(d.id) === String(sourceDepartmentId));
    if (!source) return;

    await apiPut(`/organization/departments/${sourceDepartmentId}`, {
      code: source.code,
      name_th: source.name_th,
      company_id: targetCompanyId,
      parent_dept_id: targetParentDepartmentId,
      cost_center: source.cost_center || null,
    });

    await fetchData();
    toast({ title: "Moved department" });
  };

  const handleMovePosition = async (sourcePositionId: string, targetDepartmentId: string | null, targetCompanyId: string) => {
    const source = positions.find((p) => String(p.id) === String(sourcePositionId));
    if (!source) return;

    await apiPut(`/organization/positions/${sourcePositionId}`, {
      code: source.code || null,
      title_th: source.title_th,
      level: source.level || null,
      company_id: targetCompanyId,
      department_id: targetDepartmentId,
    });

    await fetchData();
    toast({ title: "Moved position" });
  };

  const requestDelete = (type: "department" | "position", id: string, label: string) => {
    setConfirmDelete({ open: true, type, id, label });
  };

  const confirmDeleteAction = async () => {
    const { type, id } = confirmDelete;
    if (!id) return;

    if (type === "department") {
      await handleDeleteDepartment(id);
    } else {
      await handleDeletePosition(id);
    }

    setConfirmDelete({ open: false, type: "department", id: "", label: "" });
  };

  if (loading) return <div className="p-6 text-center">{t("organizationStructure.loading")}</div>
  if (error) return <div className="p-6 text-center text-red-600">{t("organizationStructure.errorPrefix")}: {error}</div>;
  if (!data) return <div className="p-6 text-center">{t("organizationStructure.noData")}</div>;

  const showAllMasterSections = canUseMasterTabs && activeTab === "all";

  return (
    <div className="space-y-6 animate-fade-in">
      {canUseMasterTabs && (showAllMasterSections || activeTab === "companies") && <div className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.company.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && <div className="text-sm text-primary">{message}</div>}
              {canManageCompanyMaster && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("organizationStructure.company.fields.code")}</Label>
                  <Input value={companyForm.code} onChange={(e) => setCompanyForm((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.company.fields.nameTh")}</Label>
                  <Input value={companyForm.name_th} onChange={(e) => setCompanyForm((p) => ({ ...p, name_th: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.company.fields.nameEn")}</Label>
                  <Input value={companyForm.name_en} onChange={(e) => setCompanyForm((p) => ({ ...p, name_en: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.company.fields.taxId")}</Label>
                  <Input value={companyForm.tax_id} onChange={(e) => setCompanyForm((p) => ({ ...p, tax_id: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.company.fields.logoUrl")}</Label>
                  <Input value={companyForm.logo_url} onChange={(e) => setCompanyForm((p) => ({ ...p, logo_url: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.company.fields.phone")}</Label>
                  <Input value={companyForm.phone} onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>{t("organizationStructure.company.fields.address")}</Label>
                  <Textarea value={companyForm.address} onChange={(e) => setCompanyForm((p) => ({ ...p, address: e.target.value }))} />
                </div>
              </div>}
              {canManageCompanyMaster && (
                <Button className="gap-1.5" onClick={handleAddCompany}><Plus className="h-4 w-4" /> {t("organizationStructure.company.add")}</Button>
              )}

              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">{t("organizationStructure.company.table.code")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.company.table.nameTh")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.company.table.nameEn")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.company.table.taxId")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.company.table.contact")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c) => (
                      <tr key={c.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{c.code || "-"}</td>
                        <td className="px-3 py-2">{c.name_th || "-"}</td>
                        <td className="px-3 py-2">{c.name_en || "-"}</td>
                        <td className="px-3 py-2">{c.tax_id || "-"}</td>
                        <td className="px-3 py-2">{c.phone || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>}

        {canUseMasterTabs && (showAllMasterSections || activeTab === "division") && <div className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.division.title", "Division Master")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("organizationStructure.department.fields.code")}</Label>
                  <Input value={departmentForm.code} onChange={(e) => setDepartmentForm((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.name")}</Label>
                  <Input value={departmentForm.name_th} onChange={(e) => setDepartmentForm((p) => ({ ...p, name_th: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.company")}</Label>
                  <Select value={departmentForm.company_id} onValueChange={(val) => setDepartmentForm((p) => ({ ...p, company_id: val }))}>
                    <SelectTrigger><SelectValue placeholder={t("organizationStructure.department.placeholders.selectCompany")} /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name_th || c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.costCenter")}</Label>
                  <Input value={departmentForm.cost_center} onChange={(e) => setDepartmentForm((p) => ({ ...p, cost_center: e.target.value }))} />
                </div>
              </div>
              {canManageOrg && (
                <div className="flex items-center gap-2">
                  <Button className="gap-1.5" onClick={handleAddDepartment} disabled={submitting}><Plus className="h-4 w-4" /> {editingDepartmentId ? "Update Division" : "Add Division"}</Button>
                  {editingDepartmentId && <Button variant="outline" onClick={resetDepartmentForm}>Cancel Edit</Button>}
                </div>
              )}

              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.code")}</th>
                      <th className="text-left px-3 py-2">Division</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.company")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.costCenter")}</th>
                      {canManageOrg && <th className="text-left px-3 py-2">Manage</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {divisionRows.map((d) => (
                      <tr key={d.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{d.code || "-"}</td>
                        <td className="px-3 py-2">{d.name_th || "-"}</td>
                        <td className="px-3 py-2">{d.company_name || d.company_id || "-"}</td>
                        <td className="px-3 py-2">{d.cost_center || "-"}</td>
                        {canManageOrg && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditDepartment(d)}>Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => requestDelete("department", String(d.id), d.name_th || "Division")}>Delete</Button>
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
        </div>}

        {canUseMasterTabs && (showAllMasterSections || activeTab === "section") && <div className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.section.title", "Section Master")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("organizationStructure.department.fields.code")}</Label>
                  <Input value={departmentForm.code} onChange={(e) => setDepartmentForm((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.name")}</Label>
                  <Input value={departmentForm.name_th} onChange={(e) => setDepartmentForm((p) => ({ ...p, name_th: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.company")}</Label>
                  <Select value={departmentForm.company_id} onValueChange={(val) => setDepartmentForm((p) => ({ ...p, company_id: val }))}>
                    <SelectTrigger><SelectValue placeholder={t("organizationStructure.department.placeholders.selectCompany")} /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name_th || c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.parent")}</Label>
                  <Select value={departmentForm.parent_dept_id || "none"} onValueChange={(val) => setDepartmentForm((p) => ({ ...p, parent_dept_id: val === "none" ? "" : val }))}>
                    <SelectTrigger><SelectValue placeholder={t("organizationStructure.department.placeholders.selectParent")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("organizationStructure.none")}</SelectItem>
                      {(divisionOptions.length > 0 ? divisionOptions : deptOptions).map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.costCenter")}</Label>
                  <Input value={departmentForm.cost_center} onChange={(e) => setDepartmentForm((p) => ({ ...p, cost_center: e.target.value }))} />
                </div>
              </div>
              {canManageOrg && (
                <div className="flex items-center gap-2">
                  <Button className="gap-1.5" onClick={handleAddDepartment} disabled={submitting}><Plus className="h-4 w-4" /> {editingDepartmentId ? "Update Section" : "Add Section"}</Button>
                  {editingDepartmentId && <Button variant="outline" onClick={resetDepartmentForm}>Cancel Edit</Button>}
                </div>
              )}

              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.code")}</th>
                      <th className="text-left px-3 py-2">Section</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.company")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.parent")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.costCenter")}</th>
                      {canManageOrg && <th className="text-left px-3 py-2">Manage</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((d) => (
                      <tr key={d.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{d.code || "-"}</td>
                        <td className="px-3 py-2">{d.name_th || "-"}</td>
                        <td className="px-3 py-2">{d.company_name || d.company_id || "-"}</td>
                        <td className="px-3 py-2">{d.parent_dept_id || "-"}</td>
                        <td className="px-3 py-2">{d.cost_center || "-"}</td>
                        {canManageOrg && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditDepartment(d)}>Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => requestDelete("department", String(d.id), d.name_th || "Section")}>Delete</Button>
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
        </div>}

        {canUseMasterTabs && (showAllMasterSections || activeTab === "department") && <div className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.department.title", "Department Master")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("organizationStructure.department.fields.code")}</Label>
                  <Input value={departmentForm.code} onChange={(e) => setDepartmentForm((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.name")}</Label>
                  <Input value={departmentForm.name_th} onChange={(e) => setDepartmentForm((p) => ({ ...p, name_th: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.company")}</Label>
                  <Select value={departmentForm.company_id} onValueChange={(val) => setDepartmentForm((p) => ({ ...p, company_id: val }))}>
                    <SelectTrigger><SelectValue placeholder={t("organizationStructure.department.placeholders.selectCompany")} /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name_th || c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.parent")}</Label>
                  <Select value={departmentForm.parent_dept_id || "none"} onValueChange={(val) => setDepartmentForm((p) => ({ ...p, parent_dept_id: val === "none" ? "" : val }))}>
                    <SelectTrigger><SelectValue placeholder={t("organizationStructure.department.placeholders.selectParent")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("organizationStructure.none")}</SelectItem>
                      {(sectionOptions.length > 0 ? sectionOptions : deptOptions).map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("organizationStructure.department.fields.costCenter")}</Label>
                  <Input value={departmentForm.cost_center} onChange={(e) => setDepartmentForm((p) => ({ ...p, cost_center: e.target.value }))} />
                </div>
              </div>
              {canManageOrg && (
                <div className="flex items-center gap-2">
                  <Button className="gap-1.5" onClick={handleAddDepartment} disabled={submitting}><Plus className="h-4 w-4" /> {editingDepartmentId ? "Update Department" : "Add Department"}</Button>
                  {editingDepartmentId && <Button variant="outline" onClick={resetDepartmentForm}>Cancel Edit</Button>}
                </div>
              )}

              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.code")}</th>
                      <th className="text-left px-3 py-2">Department</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.company")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.parent")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.costCenter")}</th>
                      {canManageOrg && <th className="text-left px-3 py-2">Manage</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {departmentRows.map((d) => (
                      <tr key={d.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{d.code || "-"}</td>
                        <td className="px-3 py-2">{d.name_th || "-"}</td>
                        <td className="px-3 py-2">{d.company_name || d.company_id || "-"}</td>
                        <td className="px-3 py-2">{d.parent_dept_id || "-"}</td>
                        <td className="px-3 py-2">{d.cost_center || "-"}</td>
                        {canManageOrg && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditDepartment(d)}>Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => requestDelete("department", String(d.id), d.name_th || "Department")}>Delete</Button>
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
        </div>}

        {canUseMasterTabs && (showAllMasterSections || activeTab === "position") && <div className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.position.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t("organizationStructure.position.fields.code")}</Label>
                  <Input value={positionForm.code} onChange={(e) => setPositionForm((p) => ({ ...p, code: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.position.fields.title")}</Label>
                  <Input value={positionForm.title_th} onChange={(e) => setPositionForm((p) => ({ ...p, title_th: e.target.value }))} />
                </div>
                <div>
                  <Label>{t("organizationStructure.position.fields.level")}</Label>
                  <Select value={positionForm.level} onValueChange={(val) => setPositionForm((p) => ({ ...p, level: val }))}>
                    <SelectTrigger><SelectValue placeholder={t("organizationStructure.position.placeholders.selectLevel")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("organizationStructure.position.fields.company")}</Label>
                  <Select value={positionForm.company_id} onValueChange={(val) => setPositionForm((p) => ({ ...p, company_id: val }))}>
                    <SelectTrigger><SelectValue placeholder={t("organizationStructure.position.placeholders.selectCompany")} /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name_th || c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("organizationStructure.position.fields.department")}</Label>
                  <Select value={positionForm.department_id || "none"} onValueChange={(val) => setPositionForm((p) => ({ ...p, department_id: val === "none" ? "" : val }))}>
                    <SelectTrigger><SelectValue placeholder={t("organizationStructure.position.placeholders.selectDepartment")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("organizationStructure.unspecified")}</SelectItem>
                      {deptOptions.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {canManageOrg && (
                <div className="flex items-center gap-2">
                  <Button className="gap-1.5" onClick={handleAddPosition} disabled={submitting}><Plus className="h-4 w-4" /> {editingPositionId ? "Update Position" : t("organizationStructure.position.add")}</Button>
                  {editingPositionId && <Button variant="outline" onClick={resetPositionForm}>Cancel Edit</Button>}
                </div>
              )}

              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.code")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.title")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.level")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.company")}</th>
                      {canManageOrg && <th className="text-left px-3 py-2">Manage</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr key={p.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{p.code || "-"}</td>
                        <td className="px-3 py-2">{p.title_th || "-"}</td>
                        <td className="px-3 py-2">{p.level || "-"}</td>
                        <td className="px-3 py-2">{p.company_name || p.company_id || "-"}</td>
                        {canManageOrg && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditPosition(p)}>Edit</Button>
                              <Button variant="destructive" size="sm" onClick={() => requestDelete("position", String(p.id), p.title_th || "Position")}>Delete</Button>
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
        </div>}

        {canUseMasterTabs && (showAllMasterSections || activeTab === "level") && <div className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.level.title", "Level Overview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">Level</th>
                      <th className="text-left px-3 py-2">Positions</th>
                      <th className="text-left px-3 py-2">Companies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelSummaries.map((row) => (
                      <tr key={row.level} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{row.level}</td>
                        <td className="px-3 py-2">{row.count}</td>
                        <td className="px-3 py-2">{row.companyCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">Level</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.title")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.company")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions
                      .slice()
                      .sort((a, b) => `${a.level || ""}${a.title_th || ""}`.localeCompare(`${b.level || ""}${b.title_th || ""}`))
                      .map((p) => (
                        <tr key={p.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2">{p.level || "Unspecified"}</td>
                          <td className="px-3 py-2">{p.title_th || "-"}</td>
                          <td className="px-3 py-2">{p.company_name || p.company_id || "-"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>}

        {(activeTab === "org-chart" || showAllMasterSections) && <div className="mt-4">
          {canUseMasterTabs && (isSuperAdmin || companies.length > 0) && canManageOrg && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">{t("organizationStructure.adminTools.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button onClick={() => setActiveTab("companies")}>{t("organizationStructure.adminTools.addCompany")}</Button>
                  <Button variant="outline" onClick={() => setActiveTab("department")}>{t("organizationStructure.adminTools.createDepartment")}</Button>
                  <Button variant="outline" onClick={() => setActiveTab("position")}>{t("organizationStructure.adminTools.createPosition")}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.orgChartTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TreeNode
                node={data}
                canManageOrg={canManageOrg}
                onMoveDepartment={handleMoveDepartment}
                onMovePosition={handleMovePosition}
              />
            </CardContent>
          </Card>
        </div>}

      <AlertDialog open={confirmDelete.open} onOpenChange={(open) => setConfirmDelete((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {confirmDelete.type} {confirmDelete.label} permanently?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAction}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrganizationStructure;
