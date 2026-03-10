import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, RefreshCw, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/types/roles";

const templates = [
  {
    id: 1,
    name: "สัญญาจ้างทั่วไป - ABC Holdings",
    company: "ABC",
    logoUrl: "https://dummyimage.com/120x40/1e3a8a/ffffff.png&text=ABC",
    content:
      "ข้อตกลงการจ้างงานระหว่าง {{company_name}} และ {{employee_name}} ในตำแหน่ง {{position}} อัตราเงินเดือน {{salary}} บาท เริ่มวันที่ {{start_date}} ถึง {{end_date}}",
    variables: ["{{employee_name}}", "{{position}}", "{{salary}}", "{{start_date}}", "{{end_date}}", "{{company_name}}"],
  },
  {
    id: 2,
    name: "สัญญาจ้างทั่วไป - XYZ Services",
    company: "XYZ",
    logoUrl: "https://dummyimage.com/120x40/166534/ffffff.png&text=XYZ",
    content:
      "สัญญาฉบับนี้จัดทำขึ้นสำหรับ {{employee_name}} ตำแหน่ง {{position}} โดย {{company_name}} ระยะเวลาสัญญา {{start_date}} ถึง {{end_date}} ค่าตอบแทน {{salary}} บาท",
    variables: ["{{employee_name}}", "{{position}}", "{{salary}}", "{{start_date}}", "{{end_date}}", "{{company_name}}"],
  },
  {
    id: 3,
    name: "สัญญาทดลองงาน - Group",
    company: "ALL",
    logoUrl: "https://dummyimage.com/120x40/7c3aed/ffffff.png&text=GROUP",
    content:
      "{{employee_name}} เข้าปฏิบัติงานตำแหน่ง {{position}} เริ่ม {{start_date}} โดยมีเงื่อนไขทดลองงานตามระเบียบบริษัท {{company_name}}",
    variables: ["{{employee_name}}", "{{position}}", "{{start_date}}", "{{company_name}}"],
  },
];

const statusColor: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  expiring: "bg-warning/10 text-warning border-warning/20",
};

const contractTypeLabel: Record<string, string> = {
  probation: "ทดลองงาน",
  yearly: "รายปี",
  permanent: "ประจำ",
};

const ContractManagement = () => {
  const { hasPermission } = useAuth();
  const canManageCompanyContracts = hasPermission(Permission.MANAGE_COMPANY_CONTRACTS);
  const canManageTemplates = hasPermission(Permission.MANAGE_CONTRACT_TEMPLATES);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(templates[0].id);
  const [templateDraft, setTemplateDraft] = useState({
    name: "",
    company: "ABC",
    logoUrl: "",
    content: "",
  });

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        const data = await apiGet<any>("/contracts");
        setContracts(Array.isArray(data) ? data : data?.data || []);
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
        contractType: contractTypeLabel[String(c.contract_type || "").toLowerCase()] || c.contract_type || "-",
        start: c.start_date,
        end: c.end_date,
        status: normalizedStatus,
        daysLeft,
      };
    });
  }, [contracts]);

  const selectedTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === selectedTemplateId) || templates[0],
    [selectedTemplateId],
  );

  const handleGeneratePdf = (contract: any) => {
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
            <img class="logo" src="${selectedTemplate.logoUrl}" alt="logo" />
            <div class="meta">Generated at ${new Date().toLocaleString()}</div>
          </div>
          <h1>Employment Contract</h1>
          <div>
            <span class="badge">${contract.contractType}</span>
            <span class="badge">${contract.status.toUpperCase()}</span>
          </div>
          <div class="content">${templateText}</div>
          <div class="sign">
            <div>Employee Signature</div>
            <div>Company Signature</div>
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
      alert("กรุณากรอกชื่อเทมเพลตและเนื้อหา");
      return;
    }
    alert("สร้างเทมเพลตสำเร็จ (เดโมหน้า UI)");
    setTemplateDraft({ name: "", company: "ABC", logoUrl: "", content: "" });
  };

  return (
  <div className="space-y-6 animate-fade-in">
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">Contract List</TabsTrigger>
        {canManageTemplates && <TabsTrigger value="templates">Templates</TabsTrigger>}
      </TabsList>

      <TabsContent value="list" className="mt-4">
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contract Management (Company Scoped)</CardTitle>
            {canManageCompanyContracts && (
              <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Create Contract</Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading contracts...</div>
            ) : (
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contract Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">End</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
              </tr></thead>
              <tbody>
                {contractRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No contracts found in your company scope</td>
                  </tr>
                ) : contractRows.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.employee}</td>
                    <td className="px-4 py-3">{c.contractType}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{c.company}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs">{c.start}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.end}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusColor[c.status] || statusColor.active}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canManageCompanyContracts ? (
                          <Button size="sm" variant="ghost" className="gap-1 text-xs h-7"><RefreshCw className="h-3 w-3" /> Renew</Button>
                        ) : null}
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => handleGeneratePdf(c)}>
                          <FileText className="h-3 w-3" /> Generate PDF
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
      </TabsContent>

      {canManageTemplates && (
      <TabsContent value="templates" className="mt-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Contract Templates (Company)</CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> New Template</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Template Builder</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Template Name</p>
                      <Input value={templateDraft.name} onChange={(e) => setTemplateDraft((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Company (Logo Scope)</p>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={templateDraft.company}
                        onChange={(e) => setTemplateDraft((p) => ({ ...p, company: e.target.value }))}
                      >
                        <option value="ABC">ABC</option>
                        <option value="XYZ">XYZ</option>
                        <option value="DEF">DEF</option>
                        <option value="ALL">ALL</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Logo URL</p>
                      <Input value={templateDraft.logoUrl} onChange={(e) => setTemplateDraft((p) => ({ ...p, logoUrl: e.target.value }))} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Template Content</p>
                      <Textarea
                        className="min-h-[120px]"
                        value={templateDraft.content}
                        onChange={(e) => setTemplateDraft((p) => ({ ...p, content: e.target.value }))}
                        placeholder="ใช้ตัวแปรเช่น {{employee_name}}, {{position}}, {{salary}}"
                      />
                    </div>
                    <Button size="sm" onClick={handleCreateTemplate}>Save Template</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Template Preview Variables</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">เลือกเทมเพลตเพื่อใช้งานตอน Generate PDF</p>
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
                    <img src={selectedTemplate.logoUrl} alt="company-logo" className="h-8 object-contain" />
                    <div className="flex gap-1.5 flex-wrap">
                      {selectedTemplate.variables.map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                      ))}
                    </div>
                    <div className="rounded-md border p-3 text-xs text-muted-foreground bg-muted/20">
                      {selectedTemplate.content}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
              {templates.map((t) => (
                <div key={t.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {t.variables.map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                        ))}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{t.company}</Badge>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      )}
    </Tabs>
  </div>
  );
};

export default ContractManagement;
