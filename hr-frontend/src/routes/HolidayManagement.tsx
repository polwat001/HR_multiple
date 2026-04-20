import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { t } = useLanguage();
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
      alert(error?.message || t("holidayManagement.fetchFailed"));
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
      alert(t("holidayManagement.noManagePermission"));
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
      alert(error?.message || t("holidayManagement.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canManage) {
      alert(t("holidayManagement.noDeletePermission"));
      return;
    }
    if (!confirm(t("holidayManagement.deleteConfirm"))) return;

    try {
      await apiDelete(`/holidays/${id}`);
      await loadHolidays();
    } catch (error: any) {
      alert(error?.message || t("holidayManagement.deleteFailed"));
    }
  };

return (
  <div className="space-y-8 animate-fade-in pb-10">
    {/* ---------------- FORM SECTION ---------------- */}
    <Card className="shadow-sm border-border/50 overflow-hidden">

      <CardHeader className="bg-muted/20 border-b pb-4 pt-5">
        <CardTitle className="text-base font-semibold flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4 text-primary" /> 
          {t("holidayManagement.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {!canManage && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-800 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            {t("holidayManagement.readOnlyNotice")}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">
              {t("holidayManagement.fields.date")}
            </label>
            <Input
              type="date"
              value={form.holiday_date}
              disabled={!canManage}
              onChange={(e) => setForm((p) => ({ ...p, holiday_date: e.target.value }))}
              className="h-10 focus-visible:ring-primary transition-all disabled:bg-muted/50"
            />
          </div>
          {/* Pay Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">
              {t("holidayManagement.fields.payType")}
            </label>
            <select
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canManage}
              value={form.is_paid}
              onChange={(e) => setForm((p) => ({ ...p, is_paid: e.target.value }))}
            >
              <option value="1">{t("holidayManagement.payType.paidHoliday")}</option>
              <option value="0">{t("holidayManagement.payType.unpaidHoliday")}</option>
            </select>
          </div>

          {/* Name TH */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">
              {t("holidayManagement.fields.nameTh")}
            </label>
            <Input
              value={form.holiday_name_th}
              disabled={!canManage}
              onChange={(e) => setForm((p) => ({ ...p, holiday_name_th: e.target.value }))}
              className="h-10 focus-visible:ring-primary transition-all disabled:bg-muted/50"
              placeholder="เช่น วันปีใหม่"
            />
          </div>
          {/* Name EN */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">
              {t("holidayManagement.fields.nameEn")}
            </label>
            <Input
              value={form.holiday_name_en}
              disabled={!canManage}
              onChange={(e) => setForm((p) => ({ ...p, holiday_name_en: e.target.value }))}
              className="h-10 focus-visible:ring-primary transition-all disabled:bg-muted/50"
              placeholder="e.g. New Year's Day"
            />
          </div>
        </div>
        {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground block">
              {t("holidayManagement.fields.description")}
            </label>
            <Input
              value={form.description}
              disabled={!canManage}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="h-10 focus-visible:ring-primary transition-all disabled:bg-muted/50"
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
            />
          </div>

        {/* Add Buttons */}
        <div className="flex justify-end items-center gap-3 pt-2">
          <Button 
            className="gap-2 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            onClick={handleSaveHoliday} 
            disabled={!canManage || !canSave || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editingId 
              ? t("holidayManagement.actions.saveChanges") 
              : t("holidayManagement.actions.addHoliday")}
          </Button>

          {editingId && (
            <Button 
              variant="outline" 
              className="px-6 hover:bg-muted"
              onClick={resetForm} 
              disabled={submitting}
            >
              {t("holidayManagement.actions.cancelEdit")}
            </Button>
          )}
        </div>

      </CardContent>
    </Card>

    {/* ---------------- TABLE SECTION ---------------- */}
    <Card className="shadow-sm border-border/50 overflow-hidden">
      <CardHeader className="bg-muted/20 border-b pb-4 pt-5">
        <CardTitle className="text-base font-semibold">
          {t("holidayManagement.calendarTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("holidayManagement.table.date")}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("holidayManagement.table.nameTh")}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("holidayManagement.table.nameEn")}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap">{t("holidayManagement.table.type")}</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground whitespace-nowrap text-right">{t("holidayManagement.table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted-foreground animate-pulse">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
                      {t("holidayManagement.loading")}
                    </div>
                  </td>
                </tr>
              ) : holidays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground bg-muted/5">
                    {t("holidayManagement.empty")}
                  </td>
                </tr>
              ) : (
                holidays.map((h) => {
                  const isPaid = Number(h.is_paid ?? 1) === 1;
                  return (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-5 py-4 font-mono text-sm text-muted-foreground whitespace-nowrap">
                        {String(h.holiday_date || "").slice(0, 10)}
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">
                        {h.holiday_name_th}
                      </td>
                      <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                        {h.holiday_name_en || <span className="text-muted-foreground/30">-</span>}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Badge 
                          variant="outline" 
                          className={`font-medium shadow-sm ${
                            isPaid 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isPaid ? t("holidayManagement.payType.paid") : t("holidayManagement.payType.unpaid")}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canManage}
                            className="h-8 gap-1.5 hover:bg-muted text-xs shadow-sm hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:border-muted disabled:text-muted-foreground"
                            onClick={() => startEdit(h)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> {t("holidayManagement.actions.edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canManage}
                            className="h-8 gap-1.5 text-xs shadow-sm border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:border-muted disabled:text-muted-foreground"
                            onClick={() => handleDelete(h.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> {t("holidayManagement.actions.delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  </div>
);
};

export default HolidayManagement;
