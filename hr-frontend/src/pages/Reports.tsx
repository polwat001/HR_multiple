import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileText, Download, Users, Clock, TrendingUp, FileWarning } from "lucide-react";
import { useState } from "react";

const reports = [
  { id: "employee-master", name: "Employee Master (ทะเบียนพนักงาน)", icon: Users, description: "รายชื่อพนักงานพร้อมข้อมูลสำคัญ" },
  { id: "attendance-summary", name: "Attendance Summary (สรุปขาดลามาสาย)", icon: Clock, description: "สรุปสถิติการเข้างานรายเดือน" },
  { id: "ot-report", name: "OT Report (รายงานค่าล่วงเวลา)", icon: TrendingUp, description: "รายงานชั่วโมงและค่าล่วงเวลา" },
  { id: "contract-expiry", name: "Contract Expiry (รายงานสัญญาหมดอายุ)", icon: FileWarning, description: "รายการสัญญาที่ใกล้หมดอายุ" },
];

const Reports = () => {
  const [scope, setScope] = useState("all");
  const [format, setFormat] = useState("excel");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report List */}
        <div className="lg:col-span-2 space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <r.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Download className="h-4 w-4" /> Generate
                </Button>
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
              {format === "pdf" && scope === "current"
                ? "PDF will use the selected company's header & logo"
                : format === "pdf" && scope === "all"
                ? "PDF will use Group (Holding) header"
                : "Excel file will include all selected data"}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
