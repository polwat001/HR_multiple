import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CalendarDays } from "lucide-react";

const companyOptions = ["ABC", "XYZ", "DEF"];

const initialHolidays = [
  { id: 1, date: "2026-01-01", nameTh: "วันขึ้นปีใหม่", nameEn: "New Year's Day", applyTo: "all", companies: [] as string[] },
  { id: 2, date: "2026-04-13", nameTh: "วันสงกรานต์", nameEn: "Songkran Festival", applyTo: "selected", companies: ["ABC", "DEF"] },
  { id: 3, date: "2026-12-05", nameTh: "วันพ่อแห่งชาติ", nameEn: "Father's Day", applyTo: "all", companies: [] as string[] },
];

const HolidayManagement = () => {
  const [holidays, setHolidays] = useState(initialHolidays);
  const [form, setForm] = useState({
    date: "",
    nameTh: "",
    nameEn: "",
    applyTo: "all" as "all" | "selected",
    companies: [] as string[],
  });

  const applyToLabel = (item: { applyTo: string; companies: string[] }) => {
    if (item.applyTo === "all") return "ทุกบริษัทในเครือ";
    return item.companies.length > 0 ? `เฉพาะ ${item.companies.join(", ")}` : "เฉพาะบางบริษัท";
  };

  const toggleCompany = (company: string) => {
    setForm((prev) => {
      const exists = prev.companies.includes(company);
      return {
        ...prev,
        companies: exists ? prev.companies.filter((c) => c !== company) : [...prev.companies, company],
      };
    });
  };

  const canSave = useMemo(() => {
    if (!form.date || !form.nameTh || !form.nameEn) return false;
    if (form.applyTo === "selected" && form.companies.length === 0) return false;
    return true;
  }, [form]);

  const handleAddHoliday = () => {
    if (!canSave) return;
    setHolidays((prev) => [
      {
        id: Date.now(),
        date: form.date,
        nameTh: form.nameTh,
        nameEn: form.nameEn,
        applyTo: form.applyTo,
        companies: form.applyTo === "selected" ? form.companies : [],
      },
      ...prev,
    ]);

    setForm({ date: "", nameTh: "", nameEn: "", applyTo: "all", companies: [] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Holiday Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">วัน/เดือน/ปี</p>
              <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">ชื่อวันหยุด (TH)</p>
              <Input value={form.nameTh} onChange={(e) => setForm((p) => ({ ...p, nameTh: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">ชื่อวันหยุด (EN)</p>
              <Input value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Apply to</p>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.applyTo}
                onChange={(e) => setForm((p) => ({ ...p, applyTo: e.target.value as "all" | "selected", companies: e.target.value === "all" ? [] : p.companies }))}
              >
                <option value="all">ทุกบริษัทในเครือ</option>
                <option value="selected">เฉพาะบางบริษัท</option>
              </select>
            </div>
          </div>

          {form.applyTo === "selected" && (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium mb-2">เลือกบริษัทที่ใช้วันหยุดนี้</p>
              <div className="flex flex-wrap gap-4">
                {companyOptions.map((company) => (
                  <label key={company} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.companies.includes(company)} onCheckedChange={() => toggleCompany(company)} />
                    <span>{company}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button className="gap-1.5" onClick={handleAddHoliday} disabled={!canSave}>
            <Plus className="h-4 w-4" /> Add Holiday
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base">Holiday Calendar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Holiday Name (TH)</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Holiday Name (EN)</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Apply to</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{h.date}</td>
                  <td className="px-4 py-3">{h.nameTh}</td>
                  <td className="px-4 py-3">{h.nameEn}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{applyToLabel(h)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default HolidayManagement;
