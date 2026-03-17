import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiGet, apiPost, apiPut } from "@/lib/api";

const SystemSettings = () => {
  const { t } = useLanguage();
  const [groupName, setGroupName] = useState("");
  const [defaultTimezone, setDefaultTimezone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiGet<any>("/admin/system-settings");
        const data = res?.data || {};
        setGroupName(String(data.groupName || ""));
        setDefaultTimezone(String(data.defaultTimezone || "Asia/Bangkok"));
      } catch (error) {
        console.error("Failed to load system settings:", error);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await apiPut("/admin/system-settings", {
        settings: {
          groupName,
          defaultTimezone,
        },
      });
      window.alert("Saved system settings");
    } catch (error: any) {
      window.alert(error?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSystemAction = async (actionKey: string) => {
    try {
      await apiPost(`/admin/system-actions/${actionKey}`, {});
      window.alert(`Executed action: ${actionKey}`);
    } catch (error: any) {
      window.alert(error?.message || `Failed action: ${actionKey}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("systemSettings.tabs.general")}</TabsTrigger>
          <TabsTrigger value="data-fix">{t("systemSettings.tabs.dataFix")}</TabsTrigger>
          <TabsTrigger value="security">{t("systemSettings.tabs.security")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="groupName">{t("systemSettings.groupName")}</Label>
                <Input id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="timezone">{t("systemSettings.defaultTimezone")}</Label>
                <Input id="timezone" value={defaultTimezone} onChange={(e) => setDefaultTimezone(e.target.value)} />
              </div>
              <Button onClick={handleSaveSettings} disabled={saving}>{saving ? "Saving..." : t("systemSettings.saveSettings")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-fix" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.dataCorrectionTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("systemSettings.dataCorrectionDesc")}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => handleSystemAction("recalculate-leave")}>{t("systemSettings.recalculateLeave")}</Button>
                <Button variant="outline" onClick={() => handleSystemAction("reindex-attendance")}>{t("systemSettings.reindexAttendance")}</Button>
                <Button variant="destructive" onClick={() => handleSystemAction("delete-invalid")}>{t("systemSettings.deleteInvalid")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.securityTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("systemSettings.securityDesc")}</p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => handleSystemAction("force-logout")}>{t("systemSettings.forceLogout")}</Button>
                <Button variant="outline" onClick={() => handleSystemAction("rotate-api-keys")}>{t("systemSettings.rotateApiKeys")}</Button>
                <Button onClick={() => handleSystemAction("apply-security-policy")}>{t("systemSettings.applyPolicy")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;
