"use client";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown, Building2, Building, GitBranch, FolderOpen, Briefcase, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Permission, UserRole } from "@/types/roles";
import { resolveRoleViewKey } from "@/lib/accessMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

const typeConfig: Record<string, { icon: any; color: string }> = {
  group: { icon: Building2, color: "text-primary" },
  company: { icon: Building, color: "text-accent" },
  branch: { icon: GitBranch, color: "text-warning" },
  department: { icon: FolderOpen, color: "text-info" },
  position: { icon: Briefcase, color: "text-purple-600" },
};

interface OrgNode {
  id: string;
  NAME: string;
  type: string;
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

const TreeNode = ({ node, level = 0 }: { node: OrgNode; level?: number }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const config = typeConfig[node.type] || typeConfig.department;
  const Icon = config.icon;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors",
        )}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => setExpanded(!expanded)}
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
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const OrganizationStructure = () => {
  const { t } = useLanguage();
  const { hasRole, hasPermission, user } = useAuth();
  const isSuperAdmin = hasRole(UserRole.SUPER_ADMIN);
  const canManageOrg = hasPermission(Permission.MANAGE_ORGANIZATION) || isSuperAdmin;
  const roleViewKey = resolveRoleViewKey(user as any);
  const isEmployeeView = roleViewKey === "employee";
  const canUseMasterTabs =
    roleViewKey === "hr_company" ||
    roleViewKey === "central_hr" ||
    roleViewKey === "super_admin";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
          NAME: `${d.name_th}${d.cost_center ? ` (${d.cost_center})` : ""}`,
          type: "department",
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
          NAME: `${p.title_th}${p.level ? ` [${p.level}]` : ""}`,
          type: "position",
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
        NAME: `${c.name_th || c.code}${c.code ? ` (${c.code})` : ""}`,
        type: "company",
        costCenter: c.code,
        children: rootDeptNodes,
      };
    });

    return {
      id: "root",
      NAME: "Organization",
      type: "group",
      children: companyNodes,
    };
  };

  useEffect(() => {
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
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("Failed to fetch org structure:", error);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isEmployeeView && activeTab !== "org-chart") {
      setActiveTab("org-chart");
    }
  }, [activeTab, isEmployeeView]);

  const deptOptions = useMemo(() => departments.map((d) => ({ label: d.name_th, value: String(d.id) })), [departments]);

  const handleAddCompany = () => {
    if (!companyForm.code || !companyForm.name_th) return;
    const newCompany: Company = {
      id: `new-${Date.now()}`,
      code: companyForm.code,
      name_th: companyForm.name_th,
      name_en: companyForm.name_en,
      tax_id: companyForm.tax_id,
      logo_url: companyForm.logo_url,
      address: companyForm.address,
      phone: companyForm.phone,
    };

    const nextCompanies = [newCompany, ...companies];
    setCompanies(nextCompanies);
    setData(buildTree(nextCompanies, departments, positions));
    setCompanyForm({ code: "", name_th: "", name_en: "", tax_id: "", logo_url: "", address: "", phone: "" });
    setMessage(t("organizationStructure.messages.companyAddedDemo"));
  };

  const handleAddDepartment = () => {
    if (!departmentForm.code || !departmentForm.name_th) return;
    const linkedCompany = companies.find((c) => String(c.id) === departmentForm.company_id);
    const newDept: Department = {
      id: `new-${Date.now()}`,
      code: departmentForm.code,
      name_th: departmentForm.name_th,
      company_id: departmentForm.company_id || undefined,
      company_name: linkedCompany?.name_th,
      parent_dept_id: departmentForm.parent_dept_id || null,
      cost_center: departmentForm.cost_center,
    };

    const nextDepartments = [newDept, ...departments];
    setDepartments(nextDepartments);
    setData(buildTree(companies, nextDepartments, positions));
    setDepartmentForm({ code: "", name_th: "", company_id: "", parent_dept_id: "", cost_center: "" });
    setMessage(t("organizationStructure.messages.departmentAddedDemo"));
  };

  const handleAddPosition = () => {
    if (!positionForm.code || !positionForm.title_th) return;
    const linkedCompany = companies.find((c) => String(c.id) === positionForm.company_id);
    const newPosition: Position = {
      id: `new-${Date.now()}`,
      code: positionForm.code,
      title_th: positionForm.title_th,
      level: positionForm.level,
      company_id: positionForm.company_id || undefined,
      company_name: linkedCompany?.name_th,
      department_id: positionForm.department_id || undefined,
    };

    const nextPositions = [newPosition, ...positions];
    setPositions(nextPositions);
    setData(buildTree(companies, departments, nextPositions));
    setPositionForm({ code: "", title_th: "", level: "Staff", company_id: "", department_id: "" });
    setMessage(t("organizationStructure.messages.positionAddedDemo"));
  };

  if (loading) return <div className="p-6 text-center">{t("organizationStructure.loading")}</div>
  if (error) return <div className="p-6 text-center text-red-600">{t("organizationStructure.errorPrefix")}: {error}</div>;
  if (!data) return <div className="p-6 text-center">{t("organizationStructure.noData")}</div>;
  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {canUseMasterTabs && <TabsTrigger value="companies">{t("organizationStructure.tabs.company")}</TabsTrigger>}
          {canUseMasterTabs && <TabsTrigger value="departments">{t("organizationStructure.tabs.department")}</TabsTrigger>}
          {canUseMasterTabs && <TabsTrigger value="positions">{t("organizationStructure.tabs.position")}</TabsTrigger>}
          <TabsTrigger value="org-chart">{t("organizationStructure.tabs.orgChart")}</TabsTrigger>
        </TabsList>

        {canUseMasterTabs && <TabsContent value="companies" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.company.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message && <div className="text-sm text-primary">{message}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              {canManageOrg && (
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
        </TabsContent>}

        {canUseMasterTabs && <TabsContent value="departments" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.department.title")}</CardTitle>
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
                      {deptOptions.map((d) => (
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
                <Button className="gap-1.5" onClick={handleAddDepartment}><Plus className="h-4 w-4" /> {t("organizationStructure.department.add")}</Button>
              )}

              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.code")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.department")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.company")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.parent")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.department.table.costCenter")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{d.code || "-"}</td>
                        <td className="px-3 py-2">{d.name_th || "-"}</td>
                        <td className="px-3 py-2">{d.company_name || d.company_id || "-"}</td>
                        <td className="px-3 py-2">{d.parent_dept_id || "-"}</td>
                        <td className="px-3 py-2">{d.cost_center || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        {canUseMasterTabs && <TabsContent value="positions" className="mt-4">
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
                <Button className="gap-1.5" onClick={handleAddPosition}><Plus className="h-4 w-4" /> {t("organizationStructure.position.add")}</Button>
              )}

              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.code")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.title")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.level")}</th>
                      <th className="text-left px-3 py-2">{t("organizationStructure.position.table.company")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr key={p.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{p.code || "-"}</td>
                        <td className="px-3 py-2">{p.title_th || "-"}</td>
                        <td className="px-3 py-2">{p.level || "-"}</td>
                        <td className="px-3 py-2">{p.company_name || p.company_id || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>}

        <TabsContent value="org-chart" className="mt-4">
          {canUseMasterTabs && (isSuperAdmin || companies.length > 0) && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">{t("organizationStructure.adminTools.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button onClick={() => setActiveTab("companies")}>{t("organizationStructure.adminTools.addCompany")}</Button>
                  <Button variant="outline" onClick={() => setActiveTab("departments")}>{t("organizationStructure.adminTools.createDepartment")}</Button>
                  <Button variant="outline" onClick={() => setActiveTab("positions")}>{t("organizationStructure.adminTools.createPosition")}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("organizationStructure.orgChartTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <TreeNode node={data} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationStructure;
