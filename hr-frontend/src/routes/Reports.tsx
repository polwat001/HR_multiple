import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Download, Users, Clock, TrendingUp, CalendarCheck2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/types/roles";

const reports = [
  { id: "employee-list", name: "Employee List (ทะเบียนประวัติพนักงาน)", icon: Users, description: "รายชื่อพนักงานพร้อมข้อมูลสำคัญ" },
  { id: "attendance-summary", name: "Attendance Summary (สรุปขาดลามาสาย)", icon: Clock, description: "สรุปสถิติการเข้างานรายเดือน" },
  { id: "ot-monthly", name: "OT Monthly Summary (สรุปชั่วโมง OT ประจำเดือน)", icon: TrendingUp, description: "รายงานชั่วโมง OT สำหรับส่งทำเงินเดือน" },
  { id: "leave-usage", name: "Leave Usage (สรุปการใช้วันลา)", icon: CalendarCheck2, description: "สรุปการใช้สิทธิ์ลาตามช่วงวันที่" },
];

const mockCompanies = [
  { value: "all", label: "All Companies" },
  { value: "abc", label: "ABC" },
  { value: "xyz", label: "XYZ" },
  { value: "def", label: "DEF" },
];

const mockDepartments = [
  { value: "all", label: "ทุกแผนก" },
  { value: "hr", label: "HR" },
  { value: "it", label: "IT" },
  { value: "acc", label: "Accounting" },
  { value: "ops", label: "Operations" },
];

const employeeStatuses = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "active", label: "Active" },
  { value: "resigned", label: "Resigned" },
];

const Reports = () => {
  const { hasPermission } = useAuth();
  const isManagerReports =
    hasPermission(Permission.VIEW_DEPARTMENT_REPORTS) &&
    !hasPermission(Permission.VIEW_COMPANY_REPORTS) &&
    !hasPermission(Permission.VIEW_CONSOLIDATED_REPORTS);
  const isCompanyReports =
    hasPermission(Permission.VIEW_COMPANY_REPORTS) &&
    !hasPermission(Permission.VIEW_CONSOLIDATED_REPORTS);
  const isHoldingReports = hasPermission(Permission.VIEW_CONSOLIDATED_REPORTS);
  const [scope, setScope] = useState("all");
  const [format, setFormat] = useState("excel");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [employeeStatus, setEmployeeStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const visibleReports = isManagerReports
    ? reports.filter((r) => r.id === "attendance-summary" || r.id === "ot-monthly" || r.id === "leave-usage")
    : reports;

  const exportLabel = format === "pdf" ? "Export PDF" : "Export XLSX";

  const handleExport = (reportId: string, reportName: string, forcedFormat?: "excel" | "pdf") => {
    const selectedFormat = forcedFormat || (format as "excel" | "pdf");
    const selectedCompany =
      isManagerReports || isCompanyReports
        ? "current"
        : companyFilter || scope;
    const payload = {
      reportId,
      reportName,
      format: selectedFormat,
      company: selectedCompany,
      department: departmentFilter,
      dateFrom,
      dateTo,
      employeeStatus,
      scope: isHoldingReports ? scope : "current",
    };

    const content = JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${reportId}-${selectedFormat === "pdf" ? "pdf" : "xlsx"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Report Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">บริษัท</p>
            {isManagerReports || isCompanyReports ? (
              <div className="h-10 rounded-md border border-input px-3 flex items-center text-sm bg-muted/30">Current Company</div>
            ) : (
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
              >
                {mockCompanies.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">แผนก</p>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              {mockDepartments.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">วันที่เริ่มต้น</p>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">วันที่สิ้นสุด</p>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">สถานะพนักงาน</p>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={employeeStatus}
              onChange={(e) => setEmployeeStatus(e.target.value)}
            >
              {employeeStatuses.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report List */}
        <div className="lg:col-span-2 space-y-3">
          {visibleReports.map((r) => (
            <Card key={r.id} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport(r.id, r.name, "excel")}>
                    <Download className="h-4 w-4" /> Export XLSX
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleExport(r.id, r.name, "pdf")}>
                    <Download className="h-4 w-4" /> Export PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Generate Options */}
        <Card className="shadow-card h-fit">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Generate Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm font-medium mb-3">Scope</p>
              {isManagerReports ? (
                <div className="text-sm rounded-md border border-border p-3 bg-muted/30">
                  Team Only (Department Scope)
                </div>
              ) : isCompanyReports ? (
                <div className="text-sm rounded-md border border-border p-3 bg-muted/30">
                  Current Company Only
                </div>
              ) : (
                <RadioGroup value={scope} onValueChange={setScope} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="current" id="scope-current" />
                    <Label htmlFor="scope-current" className="text-sm">Current Company Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="scope-all" />
                    <Label htmlFor="scope-all" className="text-sm">All Companies (Consolidated)</Label>
                  </div>
                </RadioGroup>
              )}
            </div>
            <div>
              <p className="text-sm font-medium mb-3">Format</p>
              <RadioGroup value={format} onValueChange={setFormat} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="excel" id="fmt-excel" />
                  <Label htmlFor="fmt-excel" className="text-sm">Excel (.xlsx)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="fmt-pdf" />
                  <Label htmlFor="fmt-pdf" className="text-sm">PDF</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              {isHoldingReports
                ? "Consolidated export mode: รวมข้อมูลทุกบริษัทในไฟล์เดียวสำหรับผู้บริหาร"
                : format === "pdf" && scope === "current"
                ? "PDF will use the selected company's header & logo"
                : format === "pdf" && scope === "all"
                ? "PDF will use Group (Holding) header"
                : "Excel file will include all selected data"}
            </div>
            <Button
              className="w-full gap-1.5"
              onClick={() => handleExport("bulk-export", "Bulk Export")}
            >
              <Download className="h-4 w-4" /> {exportLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
