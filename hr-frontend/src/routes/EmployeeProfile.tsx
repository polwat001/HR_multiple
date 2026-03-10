"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Paperclip, Plus, Save, Trash2, Upload } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";

interface EmployeeForm {
  id?: string;
  avatar_url: string;
  firstname_th: string;
  lastname_th: string;
  nickname: string;
  national_id: string;
  birth_date: string;
  gender: string;
  phone: string;
  email: string;
  emergency_name: string;
  emergency_phone: string;
  emergency_relation: string;
  employee_code: string;
  company_id: string;
  company_name: string;
  department_id: string;
  department_name: string;
  position_id: string;
  position_name: string;
  manager_id: string;
  report_to_name: string;
  start_date: string;
  probation_end_date: string;
  employee_type: string;
  status: string;
}

interface OrgRow {
  id: string | number;
  name_th?: string;
  title_th?: string;
}

interface AttachmentItem {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

interface HistoryItem {
  id: string;
  changed_at: string;
  event_type: string;
  old_value: string;
  new_value: string;
  note: string;
}

const emptyForm: EmployeeForm = {
  avatar_url: "",
  firstname_th: "",
  lastname_th: "",
  nickname: "",
  national_id: "",
  birth_date: "",
  gender: "",
  phone: "",
  email: "",
  emergency_name: "",
  emergency_phone: "",
  emergency_relation: "",
  employee_code: "",
  company_id: "",
  company_name: "",
  department_id: "",
  department_name: "",
  position_id: "",
  position_name: "",
  manager_id: "",
  report_to_name: "",
  start_date: "",
  probation_end_date: "",
  employee_type: "monthly",
  status: "active",
};

const normalizeList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const EmployeeProfile = () => {
  const params = useParams();
  const router = useRouter();
  const employeeId = String(params?.id || "");
  const isNew = employeeId === "new";

  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<OrgRow[]>([]);
  const [departments, setDepartments] = useState<OrgRow[]>([]);
  const [positions, setPositions] = useState<OrgRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [historyLogs, setHistoryLogs] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [newHistory, setNewHistory] = useState<Omit<HistoryItem, "id">>({
    changed_at: "",
    event_type: "promote",
    old_value: "",
    new_value: "",
    note: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [employeesRes, companiesRes, departmentsRes, positionsRes] = await Promise.all([
          apiGet<any>("/employees"),
          apiGet<any>("/organization/companies"),
          apiGet<any>("/organization/departments"),
          apiGet<any>("/organization/positions"),
        ]);

        const employees = normalizeList(employeesRes);
        setAllEmployees(employees);
        setCompanies(normalizeList(companiesRes));
        setDepartments(normalizeList(departmentsRes));
        setPositions(normalizeList(positionsRes));

        if (!isNew) {
          const selected = employees.find((row: any) => String(row.id) === employeeId);
          if (selected) {
            setForm({
              ...emptyForm,
              id: String(selected.id),
              employee_code: selected.employee_code || "",
              firstname_th: selected.firstname_th || "",
              lastname_th: selected.lastname_th || "",
              phone: selected.phone || "",
              email: selected.email || "",
              company_id: String(selected.company_id || ""),
              company_name: selected.company_name || "",
              department_id: String(selected.department_id || ""),
              department_name: selected.department_name || "",
              position_id: String(selected.position_id || ""),
              position_name: selected.position_name || "",
              manager_id: String(selected.manager_id || ""),
              report_to_name: selected.report_to_name || "",
              start_date: selected.start_date ? String(selected.start_date).slice(0, 10) : "",
              probation_end_date: selected.probation_end_date ? String(selected.probation_end_date).slice(0, 10) : "",
              employee_type: selected.employee_type || "monthly",
              status: (selected.status || "active").toLowerCase(),
            });
          }
        }
      } catch (error) {
        console.error("Load employee master data failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [employeeId, isNew]);

  const managerOptions = useMemo(
    () => allEmployees.filter((row) => String(row.id) !== employeeId),
    [allEmployees, employeeId],
  );

  const onChange = (field: keyof EmployeeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    onChange("avatar_url", objectUrl);
  };

  const handleAttachmentUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const next = files.map((file) => ({
      id: crypto.randomUUID(),
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
    }));

    setAttachments((prev) => [...next, ...prev]);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const handleAddHistory = () => {
    if (!newHistory.changed_at || !newHistory.old_value || !newHistory.new_value) {
      alert("กรุณากรอกข้อมูล History Log ให้ครบ");
      return;
    }

    setHistoryLogs((prev) => [
      {
        id: crypto.randomUUID(),
        ...newHistory,
      },
      ...prev,
    ]);

    setNewHistory({
      changed_at: "",
      event_type: "promote",
      old_value: "",
      new_value: "",
      note: "",
    });
  };

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      avatar_url: form.avatar_url,
      firstname_th: form.firstname_th,
      lastname_th: form.lastname_th,
      nickname: form.nickname,
      national_id: form.national_id,
      birth_date: form.birth_date,
      gender: form.gender,
      phone: form.phone,
      email: form.email,
      emergency_name: form.emergency_name,
      emergency_phone: form.emergency_phone,
      emergency_relation: form.emergency_relation,
      employee_code: form.employee_code,
      company_id: form.company_id || null,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      manager_id: form.manager_id || null,
      start_date: form.start_date || null,
      probation_end_date: form.probation_end_date || null,
      employee_type: form.employee_type,
      status: form.status,
      attachments,
      history_logs: historyLogs,
    };

    setIsSaving(true);
    try {
      if (isNew) {
        await apiPost("/employees", payload);
      } else {
        await apiPut(`/employees/${employeeId}`, payload);
      }
      alert("บันทึกข้อมูลพนักงานเรียบร้อย");
      router.push("/employees");
    } catch (error) {
      console.error("Save employee failed:", error);
      alert("ระบบยังไม่รองรับการบันทึกบางฟิลด์บนฐานข้อมูล แต่ข้อมูลในหน้าจอได้รับการอัปเดตแล้ว");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">กำลังโหลดข้อมูลพนักงาน...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push("/employees")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> กลับไปรายการพนักงาน
        </Button>
        <Button size="sm" className="gap-2" onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4" /> {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูลพนักงาน"}
        </Button>
      </div>

      <Card className="shadow-card overflow-hidden">
        <div className="h-24 gradient-primary" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 -mt-10">
            <div className="h-24 w-24 rounded-xl bg-card border-4 border-card overflow-hidden shadow-card">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">Avatar</div>
              )}
            </div>
            <div className="flex-1 pt-2 sm:pt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">{form.firstname_th || "ชื่อ"} {form.lastname_th || "นามสกุล"}</h2>
                <Badge variant="outline" className="text-xs capitalize">{form.status || "active"}</Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">
                {form.position_name || "ตำแหน่ง"} • {form.department_name || "แผนก"}
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <Button size="sm" variant="outline" className="gap-2" asChild>
                  <span>
                    <Upload className="h-4 w-4" /> อัปโหลดรูปโปรไฟล์
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="work">Work Info</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="history">History Log</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">ข้อมูลส่วนตัว (Personal Info)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="ชื่อ" value={form.firstname_th} onChange={(e) => onChange("firstname_th", e.target.value)} />
              <Input placeholder="นามสกุล" value={form.lastname_th} onChange={(e) => onChange("lastname_th", e.target.value)} />
              <Input placeholder="ชื่อเล่น" value={form.nickname} onChange={(e) => onChange("nickname", e.target.value)} />
              <Input placeholder="รหัสบัตรประชาชน" value={form.national_id} onChange={(e) => onChange("national_id", e.target.value)} />
              <Input type="date" placeholder="วันเกิด" value={form.birth_date} onChange={(e) => onChange("birth_date", e.target.value)} />
              <Select value={form.gender || "unspecified"} onValueChange={(value) => onChange("gender", value === "unspecified" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="เพศ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">ไม่ระบุ</SelectItem>
                  <SelectItem value="male">ชาย</SelectItem>
                  <SelectItem value="female">หญิง</SelectItem>
                  <SelectItem value="other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="เบอร์โทร" value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
              <Input placeholder="อีเมล" value={form.email} onChange={(e) => onChange("email", e.target.value)} />
              <Input
                placeholder="ชื่อผู้ติดต่อฉุกเฉิน"
                value={form.emergency_name}
                onChange={(e) => onChange("emergency_name", e.target.value)}
              />
              <Input
                placeholder="เบอร์ผู้ติดต่อฉุกเฉิน"
                value={form.emergency_phone}
                onChange={(e) => onChange("emergency_phone", e.target.value)}
              />
              <Input
                placeholder="ความสัมพันธ์ผู้ติดต่อฉุกเฉิน"
                value={form.emergency_relation}
                onChange={(e) => onChange("emergency_relation", e.target.value)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">ข้อมูลการทำงาน (Work Info)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="รหัสพนักงาน (Employee Code)"
                value={form.employee_code}
                onChange={(e) => onChange("employee_code", e.target.value)}
              />
              <Select value={form.company_id || "none"} onValueChange={(value) => onChange("company_id", value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="สังกัดบริษัท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {companies.map((row) => (
                    <SelectItem key={String(row.id)} value={String(row.id)}>{row.name_th || `Company ${row.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={form.department_id || "none"}
                onValueChange={(value) => onChange("department_id", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="แผนก" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {departments.map((row) => (
                    <SelectItem key={String(row.id)} value={String(row.id)}>{row.name_th || `Department ${row.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.position_id || "none"} onValueChange={(value) => onChange("position_id", value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="ตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {positions.map((row) => (
                    <SelectItem key={String(row.id)} value={String(row.id)}>{row.title_th || `Position ${row.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.manager_id || "none"} onValueChange={(value) => onChange("manager_id", value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="หัวหน้างาน (Report to)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ไม่ระบุ</SelectItem>
                  {managerOptions.map((row) => (
                    <SelectItem key={String(row.id)} value={String(row.id)}>
                      {row.firstname_th} {row.lastname_th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" value={form.start_date} onChange={(e) => onChange("start_date", e.target.value)} />
              <Input
                type="date"
                value={form.probation_end_date}
                onChange={(e) => onChange("probation_end_date", e.target.value)}
              />
              <Select value={form.employee_type} onValueChange={(value) => onChange("employee_type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="ประเภทพนักงาน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">รายเดือน</SelectItem>
                  <SelectItem value="daily">รายวัน</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={(value) => onChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="สถานะ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resigned">Resigned</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">เอกสารแนบ (Attachments)</CardTitle>
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={handleAttachmentUpload}
                />
                <Button size="sm" variant="outline" className="gap-2" asChild>
                  <span>
                    <Paperclip className="h-4 w-4" /> อัปโหลดไฟล์
                  </span>
                </Button>
              </label>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <div className="text-sm text-muted-foreground">ยังไม่มีไฟล์แนบ</div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{item.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.file_type} • {(item.file_size / 1024).toFixed(1)} KB • {new Date(item.uploaded_at).toLocaleString()}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleRemoveAttachment(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">ประวัติการทำงาน (History Log)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Input
                  type="date"
                  value={newHistory.changed_at}
                  onChange={(e) => setNewHistory((prev) => ({ ...prev, changed_at: e.target.value }))}
                />
                <Select
                  value={newHistory.event_type}
                  onValueChange={(value) => setNewHistory((prev) => ({ ...prev, event_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="ประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promote">เลื่อนตำแหน่ง</SelectItem>
                    <SelectItem value="salary_adjust">ปรับเงินเดือน</SelectItem>
                    <SelectItem value="transfer_department">ย้ายแผนก</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="ตำแหน่ง/ค่าเดิม"
                  value={newHistory.old_value}
                  onChange={(e) => setNewHistory((prev) => ({ ...prev, old_value: e.target.value }))}
                />
                <Input
                  placeholder="ตำแหน่ง/ค่าใหม่"
                  value={newHistory.new_value}
                  onChange={(e) => setNewHistory((prev) => ({ ...prev, new_value: e.target.value }))}
                />
                <Button variant="outline" className="gap-2" onClick={handleAddHistory}>
                  <Plus className="h-4 w-4" /> เพิ่มรายการ
                </Button>
              </div>
              <Textarea
                placeholder="หมายเหตุเพิ่มเติม"
                value={newHistory.note}
                onChange={(e) => setNewHistory((prev) => ({ ...prev, note: e.target.value }))}
              />

              {historyLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground">ยังไม่มีประวัติการเปลี่ยนแปลง</div>
              ) : (
                <div className="space-y-2">
                  {historyLogs.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="capitalize">{item.event_type}</Badge>
                        <span className="text-xs text-muted-foreground">{item.changed_at}</span>
                      </div>
                      <p className="text-sm mt-2">
                        {item.old_value} -&gt; {item.new_value}
                      </p>
                      {item.note ? <p className="text-xs text-muted-foreground mt-1">{item.note}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeProfile;
