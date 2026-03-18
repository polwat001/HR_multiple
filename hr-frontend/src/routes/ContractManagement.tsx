import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, RefreshCw, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/types/roles";
import { useLanguage } from "@/contexts/LanguageContext";

type ContractTemplate = {
  id: number;
  name: string;
  company: string;
  logoUrl: string;
  content: string;
  variables: string[];
};

const statusColor: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  expiring: "bg-warning/10 text-warning border-warning/20",
};

const ContractManagement = () => {
  const { hasPermission } = useAuth();
  const { t } = useLanguage();
  const canManageCompanyContracts = hasPermission(Permission.MANAGE_COMPANY_CONTRACTS);
  const canManageTemplates = hasPermission(Permission.MANAGE_CONTRACT_TEMPLATES);
  const [contracts, setContracts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [companyScopes, setCompanyScopes] = useState<string[]>(["ALL"]);
  const [loading, setLoading] = useState(true);
  const [showCreateContract, setShowCreateContract] = useState(false);
  const [newContractForm, setNewContractForm] = useState({
    employeeId: "",
    contractType: "yearly",
    startDate: "",
    endDate: "",
    salary: "",
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(0);
  const [templateDraft, setTemplateDraft] = useState({
    name: "",
    company: "ALL",
    logoUrl: "",
    content: "",
  });

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        const [contractData, employeeData, templateData, companyData] = await Promise.all([
          apiGet<any>("/contracts"),
          apiGet<any>("/employees"),
          apiGet<any>("/contracts/templates"),
          apiGet<any>("/organization/companies"),
        ]);
        setContracts(Array.isArray(contractData) ? contractData : contractData?.data || []);
        setEmployees(Array.isArray(employeeData) ? employeeData : employeeData?.data || []);
        const templateRows = Array.isArray(templateData) ? templateData : templateData?.data || [];
        setTemplates(templateRows);

        const companyRows = Array.isArray(companyData) ? companyData : companyData?.data || [];
        const scopes = ["ALL", ...companyRows.map((row: any) => String(row.code || row.id || "ALL"))];
        setCompanyScopes(Array.from(new Set(scopes)));

        if (templateRows[0]) {
          setSelectedTemplateId(Number(templateRows[0].id));
        }
      } catch (error) {
        console.error("Failed to fetch contracts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const contractRows = useMemo(() => {
    return (contracts || []).map((c: any) => {
      const endDate = c.end_date ? new Date(c.end_date) : null;
      const daysLeft = endDate
        ? Math.floor((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const rawStatus = String(c.status || "active").toLowerCase();
      const normalizedStatus = rawStatus === "expired" ? "expired" : daysLeft !== null && daysLeft < 0 ? "expired" : "active";
      return {
        id: c.id,
        employee: `${c.firstname_th || ""} ${c.lastname_th || ""}`.trim(),
        company: c.company_name || "-",
        contractType: String(c.contract_type || "").toLowerCase() || "-",
        start: c.start_date,
        end: c.end_date,
        status: normalizedStatus,
        daysLeft,
      };
    });
  }, [contracts]);

  const selectedTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedTemplateId) || templates[0] || null,
    [selectedTemplateId, templates],
  );

  const employeeOptions = useMemo(() => {
    return (employees || []).map((e: any) => ({
      id: String(e.id),
      name: `${e.firstname_th || ""} ${e.lastname_th || ""}`.trim() || e.employee_code || "-",
      employeeCode: e.employee_code || "-",
      position: e.position_name || "-",
      company: e.company_name || "-",
    }));
  }, [employees]);

  const selectedEmployee = useMemo(
    () => employeeOptions.find((e) => e.id === newContractForm.employeeId) || null,
    [employeeOptions, newContractForm.employeeId],
  );

  const handleGeneratePdf = (contract: any) => {
    if (!selectedTemplate) {
      window.alert("No contract template configured");
      return;
    }

    const templateText = selectedTemplate.content
      .replaceAll("{{employee_name}}", contract.employee || "-")
      .replaceAll("{{position}}", "-")
      .replaceAll("{{salary}}", "-")
      .replaceAll("{{start_date}}", contract.start || "-")
      .replaceAll("{{end_date}}", contract.end || "-")
      .replaceAll("{{company_name}}", contract.company || "-");

    const html = `
      <html>
        <head>
          <title>Contract ${contract.employee}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
            .logo { height: 40px; }
            .meta { font-size: 12px; color: #6b7280; }
            h1 { font-size: 22px; margin: 0 0 8px 0; }
            .badge { display: inline-block; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; margin-right: 6px; }
            .content { line-height: 1.7; margin-top: 20px; }
            .sign { margin-top: 72px; display: flex; justify-content: space-between; }
            .sign div { width: 40%; border-top: 1px solid #111827; padding-top: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            ${selectedTemplate.logoUrl ? `<img class="logo" src="${selectedTemplate.logoUrl}" alt="logo" />` : `<div style="font-weight:700">${contract.company || '-'}</div>`}
            <div class="meta">Generated at ${new Date().toLocaleString()}</div>
          </div>
          <h1>${t("contractManagement.pdf.title")}</h1>
          <div>
            <span class="badge">${contract.contractType}</span>
            <span class="badge">${contract.status.toUpperCase()}</span>
          </div>
          <div class="content">${templateText}</div>
          <div class="sign">
            <div>${t("contractManagement.pdf.employeeSignature")}</div>
            <div>${t("contractManagement.pdf.companySignature")}</div>
          </div>
        </body>
      </html>
    `;

    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleCreateTemplate = () => {
    if (!templateDraft.name || !templateDraft.content) {
      alert(t("contractManagement.alerts.fillTemplateNameAndContent"));
      return;
    }

    const variables = Array.from(new Set((templateDraft.content.match(/\{\{[^}]+\}\}/g) || [])));

    apiPost("/contracts/templates", {
      name: templateDraft.name,
      company_scope: templateDraft.company,
      logo_url: templateDraft.logoUrl,
      content: templateDraft.content,
      variables,
    })
      .then(async () => {
        const res = await apiGet<any>("/contracts/templates");
        const nextRows = Array.isArray(res) ? res : res?.data || [];
        setTemplates(nextRows);
        if (nextRows[0]) setSelectedTemplateId(Number(nextRows[0].id));
        setTemplateDraft({ name: "", company: "ALL", logoUrl: "", content: "" });
      })
      .catch((error) => {
        console.error("Failed to create template:", error);
        alert(error?.message || "Failed to create template");
      });
  };

  const handleCreateContractPdf = () => {
    if (!selectedTemplate) {
      window.alert("No contract template configured");
      return;
    }

    if (!selectedEmployee || !newContractForm.startDate || !newContractForm.endDate) {
      alert(t("contractManagement.alerts.selectEmployeeAndDates"));
      return;
    }

    const adHocContract = {
      employee: `${selectedEmployee.name} (${selectedEmployee.employeeCode})`,
      contractType: t(`contractManagement.contractType.${newContractForm.contractType}`, newContractForm.contractType),
      status: "draft",
      start: newContractForm.startDate,
      end: newContractForm.endDate,
      company: selectedEmployee.company,
      salary: newContractForm.salary || "-",
      position: selectedEmployee.position,
    };

    const templateText = selectedTemplate.content
      .replaceAll("{{employee_name}}", adHocContract.employee || "-")
      .replaceAll("{{position}}", adHocContract.position || "-")
      .replaceAll("{{salary}}", adHocContract.salary || "-")
      .replaceAll("{{start_date}}", adHocContract.start || "-")
      .replaceAll("{{end_date}}", adHocContract.end || "-")
      .replaceAll("{{company_name}}", adHocContract.company || "-");

    const html = `
      <html>
        <head>
          <title>Create Contract - ${adHocContract.employee}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
            .logo { height: 40px; }
            .meta { font-size: 12px; color: #6b7280; }
            h1 { font-size: 22px; margin: 0 0 8px 0; }
            .badge { display: inline-block; padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; margin-right: 6px; }
            .content { line-height: 1.7; margin-top: 20px; }
            .sign { margin-top: 72px; display: flex; justify-content: space-between; }
            .sign div { width: 40%; border-top: 1px solid #111827; padding-top: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            ${selectedTemplate.logoUrl ? `<img class="logo" src="${selectedTemplate.logoUrl}" alt="logo" />` : `<div style="font-weight:700">${adHocContract.company || '-'}</div>`}
            <div class="meta">Generated at ${new Date().toLocaleString()}</div>
          </div>
          <h1>${t("contractManagement.pdf.title")}</h1>
          <div>
            <span class="badge">${adHocContract.contractType}</span>
            <span class="badge">DRAFT</span>
          </div>
          <div class="content">${templateText}</div>
          <div class="sign">
            <div>${t("contractManagement.pdf.employeeSignature")}</div>
            <div>${t("contractManagement.pdf.companySignature")}</div>
          </div>
        </body>
      </html>
    `;

    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) return;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
  <div className="space-y-6 animate-fade-in">
    <div className="space-y-6">
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">{t("contractManagement.tabs.list")}</h3>
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("contractManagement.title")}</CardTitle>
            {canManageCompanyContracts && (
              <Button size="sm" className="gap-1.5" onClick={() => setShowCreateContract((v) => !v)}><Plus className="h-4 w-4" /> {t("contractManagement.createContract")}</Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {canManageCompanyContracts && showCreateContract && (
              <div className="p-4 border-b bg-muted/20 space-y-3">
                <p className="text-sm font-medium">{t("contractManagement.createContractHint")}</p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newContractForm.employeeId}
                    onChange={(e) => setNewContractForm((p) => ({ ...p, employeeId: e.target.value }))}
                  >
                    <option value="">{t("contractManagement.selectEmployee")}</option>
                    {employeeOptions.map((e) => (
                      <option key={e.id} value={e.id}>{e.employeeCode} - {e.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newContractForm.contractType}
                    onChange={(e) => setNewContractForm((p) => ({ ...p, contractType: e.target.value }))}
                  >
                    <option value="probation">{t("contractManagement.contractType.probation")}</option>
                    <option value="yearly">{t("contractManagement.contractType.yearly")}</option>
                    <option value="permanent">{t("contractManagement.contractType.permanent")}</option>
                  </select>
                  <Input type="date" value={newContractForm.startDate} onChange={(e) => setNewContractForm((p) => ({ ...p, startDate: e.target.value }))} />
                  <Input type="date" value={newContractForm.endDate} onChange={(e) => setNewContractForm((p) => ({ ...p, endDate: e.target.value }))} />
                  <Input type="number" placeholder={t("contractManagement.salaryPlaceholder")} value={newContractForm.salary} onChange={(e) => setNewContractForm((p) => ({ ...p, salary: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateContractPdf}>{t("contractManagement.createPdf")}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCreateContract(false)}>{t("contractManagement.close")}</Button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">{t("contractManagement.loading")}</div>
            ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contractManagement.table.employee")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contractManagement.table.contractType")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contractManagement.table.company")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contractManagement.table.start")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contractManagement.table.end")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contractManagement.table.status")}</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contractManagement.table.action")}</th>
              </tr></thead>
              <tbody>
                {contractRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{t("contractManagement.empty")}</td>
                  </tr>
                ) : contractRows.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.employee}</td>
                    <td className="px-4 py-3">{t(`contractManagement.contractType.${c.contractType}`, c.contractType)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{c.company}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs">{c.start}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.end}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColor[c.status] || statusColor.active}>
                        {t(`contractManagement.status.${c.status}`, c.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canManageCompanyContracts ? (
                          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7"><RefreshCw className="h-3 w-3" /> {t("contractManagement.actions.renew")}</Button>
                        ) : null}
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => handleGeneratePdf(c)}>
                          <FileText className="h-3 w-3" /> {t("contractManagement.actions.generatePdf")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </CardContent>
        </Card>
      </div>

      {canManageTemplates && (
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">{t("contractManagement.tabs.templates")}</h3>
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("contractManagement.templates.title")}</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> {t("contractManagement.templates.newTemplate")}</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("contractManagement.templates.builder")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("contractManagement.templates.fields.templateName")}</p>
                      <Input value={templateDraft.name} onChange={(e) => setTemplateDraft((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("contractManagement.templates.fields.companyScope")}</p>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={templateDraft.company}
                        onChange={(e) => setTemplateDraft((p) => ({ ...p, company: e.target.value }))}
                      >
                        {companyScopes.map((scope) => (
                          <option key={scope} value={scope}>{scope}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("contractManagement.templates.fields.logoUrl")}</p>
                      <Input value={templateDraft.logoUrl} onChange={(e) => setTemplateDraft((p) => ({ ...p, logoUrl: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("contractManagement.templates.fields.templateContent")}</p>
                      <Textarea
                        className="min-h-[120px]"
                        value={templateDraft.content}
                        onChange={(e) => setTemplateDraft((p) => ({ ...p, content: e.target.value }))}
                        placeholder={t("contractManagement.templates.fields.contentPlaceholder")}
                      />
                    </div>
                    <Button size="sm" onClick={handleCreateTemplate}>{t("contractManagement.templates.save")}</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t("contractManagement.templates.previewVariables")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("contractManagement.templates.selectTemplateForPdf")}</p>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                      >
                        {templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                        ))}
                      </select>
                    </div>
                    {selectedTemplate ? (
                      <>
                        {selectedTemplate.logoUrl ? <img src={selectedTemplate.logoUrl} alt="company-logo" className="h-8 object-contain" /> : null}
                        <div className="flex gap-1.5 flex-wrap">
                          {selectedTemplate.variables.map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                          ))}
                        </div>
                        <div className="rounded-md border p-3 text-xs text-muted-foreground bg-muted/20">
                          {selectedTemplate.content}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-md border p-3 text-xs text-muted-foreground bg-muted/20">No template available</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
              {templates.map((tpl) => (
                <div key={tpl.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{tpl.name}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {tpl.variables.map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{tpl.company}</Badge>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  </div>
  );
};

export default ContractManagement;
