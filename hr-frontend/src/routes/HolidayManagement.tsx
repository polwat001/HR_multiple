import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { resolveRoleViewKey } from "@/lib/accessMatrix";

type HolidayItem = {
  id: number;
  holiday_name_th: string;
  holiday_name_en?: string | null;
  holiday_date: string;
  is_paid?: number | boolean;
  description?: string | null;
};

type HolidayFormState = {
  holiday_name_th: string;
  holiday_name_en: string;
  holiday_date: string;
  is_paid: string;
  description: string;
};

const emptyForm: HolidayFormState = {
  holiday_name_th: "",
  holiday_name_en: "",
  holiday_date: "",
  is_paid: "1",
  description: "",
};

const normalizeHoliday = (raw: any): HolidayItem => ({
  id: Number(raw?.id || 0),
  holiday_name_th: String(raw?.holiday_name_th || raw?.name_th || raw?.holiday_name || raw?.name || ""),
  holiday_name_en: raw?.holiday_name_en || raw?.name_en || "",
  holiday_date: String(raw?.holiday_date || raw?.date || ""),
  is_paid: raw?.is_paid ?? raw?.paid ?? 1,
  description: raw?.description || "",
});

const HolidayManagement = () => {
  const { user } = useAuth();
  const roleViewKey = resolveRoleViewKey(user as any);
  const canManage = roleViewKey === "hr_company" || roleViewKey === "central_hr" || roleViewKey === "super_admin";

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [form, setForm] = useState<HolidayFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const canSave = useMemo(() => {
    if (!form.holiday_date || !form.holiday_name_th) return false;
    return true;
  }, [form]);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const data = await apiGet<any>("/holidays");
      const items = Array.isArray(data) ? data : data?.data || [];
      setHolidays(items.map(normalizeHoliday));
    } catch (error: any) {
      alert(error?.message || "ไม่สามารถโหลดข้อมูลวันหยุดได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (item: HolidayItem) => {
    setEditingId(item.id);
    setForm({
      holiday_name_th: item.holiday_name_th || "",
      holiday_name_en: item.holiday_name_en || "",
      holiday_date: String(item.holiday_date || "").slice(0, 10),
      is_paid: String(Number(item.is_paid ?? 1)),
      description: item.description || "",
    });
  };

  const handleSaveHoliday = async () => {
    if (!canManage) {
      alert("คุณไม่มีสิทธิ์จัดการวันหยุด");
      return;
    }
    if (!canSave) return;

    try {
      setSubmitting(true);
      const payload = {
        holiday_name_th: form.holiday_name_th,
        holiday_name_en: form.holiday_name_en || null,
        date: form.holiday_date,
        is_paid: Number(form.is_paid || 1),
        description: form.description || null,
      };

      if (editingId) {
        await apiPut(`/holidays/${editingId}`, payload);
      } else {
        await apiPost("/holidays", payload);
      }

      resetForm();
      await loadHolidays();
    } catch (error: any) {
      alert(error?.message || "บันทึกวันหยุดไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canManage) {
      alert("คุณไม่มีสิทธิ์ลบวันหยุด");
      return;
    }
    if (!confirm("ยืนยันการลบวันหยุดรายการนี้?")) return;

    try {
      await apiDelete(`/holidays/${id}`);
      await loadHolidays();
    } catch (error: any) {
      alert(error?.message || "ลบวันหยุดไม่สำเร็จ");
    }
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
          {!canManage && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              สิทธิ์ของคุณเป็นแบบดูข้อมูลเท่านั้น
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">วัน/เดือน/ปี</p>
              <Input
                type="date"
                value={form.holiday_date}
                disabled={!canManage}
                onChange={(e) => setForm((p) => ({ ...p, holiday_date: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">ชื่อวันหยุด (TH)</p>
              <Input
                value={form.holiday_name_th}
                disabled={!canManage}
                onChange={(e) => setForm((p) => ({ ...p, holiday_name_th: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">ชื่อวันหยุด (EN)</p>
              <Input
                value={form.holiday_name_en}
                disabled={!canManage}
                onChange={(e) => setForm((p) => ({ ...p, holiday_name_en: e.target.value }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">ประเภทการจ่าย</p>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={!canManage}
                value={form.is_paid}
                onChange={(e) => setForm((p) => ({ ...p, is_paid: e.target.value }))}
              >
                <option value="1">Paid Holiday</option>
                <option value="0">Unpaid Holiday</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">รายละเอียด</p>
              <Input
                value={form.description}
                disabled={!canManage}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="gap-1.5" onClick={handleSaveHoliday} disabled={!canManage || !canSave || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Save Changes" : "Add Holiday"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm} disabled={submitting}>
                Cancel Edit
              </Button>
            )}
          </div>
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
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading holidays...</td>
                </tr>
              ) : holidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No holiday data</td>
                </tr>
              ) : (
                holidays.map((h) => (
                  <tr key={h.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{String(h.holiday_date || "").slice(0, 10)}</td>
                    <td className="px-4 py-3">{h.holiday_name_th}</td>
                    <td className="px-4 py-3">{h.holiday_name_en || "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{Number(h.is_paid ?? 1) === 1 ? "Paid" : "Unpaid"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canManage}
                          className="gap-1"
                          onClick={() => startEdit(h)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!canManage}
                          className="gap-1"
                          onClick={() => handleDelete(h.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default HolidayManagement;
